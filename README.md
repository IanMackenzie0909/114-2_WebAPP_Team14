114-2_WebAPP_Team14
===

我們是 Web 程式設計與應用 → 第14組。  
題目是「樂高旋風忍者危機百科」。  
成員有：

- 顏伯亨
- Austin Yan (顏伯亨)
- 呂羿樺
- Ian Mackenzie (呂羿樺)  

(嗯... 對... 你沒看錯... 就我們兩個而已。😂)  

Installation：  
---

### Option A. Docker Compose

推薦第一次跑專案先用 Docker，環境會比較一致。

```bash
# Clone this repo.
git clone https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14.git

cd 114-2_WebAPP_Team14

# Optional: copy local environment settings.
# Use your own API key. 
# Get one at https://console.groq.com/home
cp .env.example .env    

# Build and start the Django container.
docker compose up --build
```

開啟：

```text
http://localhost:8000/
```

Docker 啟動時會自動執行 migration；如果是新資料庫，或 `DJANGO_SEED_INITIAL_CONTENT=1`，也會載入預設內容：

```bash
python manage.py migrate
python manage.py seed_initial_content
python manage.py ensure_superuser
python manage.py runserver 0.0.0.0:8000
```

如果需要 AI 問答功能，請在本機 `.env` 放自己的 Groq API key：

```text
GROQ_API_KEY=你的_Groq_API_Key
GROQ_MODEL=llama-3.3-70b-versatile
```

常用 Docker 指令：

```bash
docker compose up
docker compose up --build
docker compose down
docker compose run --rm web python manage.py createsuperuser
docker compose run --rm web python manage.py seed_initial_content
```

更完整的 Docker 測試流程可看 `DOCKER.md`。

### Option B. Local Python / Django

```bash
# Clone this repo.
git clone https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14.git

cd 114-2_WebAPP_Team14

# Optional: copy local environment settings.
cp .env.example .env

# Build a virtual environment (optional) 
python -m venv venv # windows
python3 -m venv venv # mac

# Activate the virtual environment (optional) 
venv\Scripts\activate # windows
source venv/bin/activate # mac & linux

# Enter the NINJAMaster folder (Django backend)
cd NINJAMaster

# Install dependencies
pip install -r requirements.txt
pip3 install -r requirements.txt # mac

# Apply migrations
python manage.py makemigrations 
python3 manage.py makemigrations # mac

# Write migrations to database
python manage.py migrate 
python3 manage.py migrate # mac

# Load default content data (optional, recommended for a new database)
python manage.py seed_initial_content
python3 manage.py seed_initial_content # mac

# Run server
python manage.py runserver 
python3 manage.py runserver # mac
```

Backend / Admin Content Maintenance：  
---

這個專案的後台維護目前分成兩塊：Django Admin 內容管理，以及預設內容資料重建。

### 1. Django Admin Maintenance

```bash
cd NINJAMaster
python manage.py runserver
```

開啟：

```text
http://127.0.0.1:8000/admin/
```

目前可在 Admin 維護的主要資料：

- `Character`：角色基本資料、元素、初登場、描述、票數。
- `CharacterImage`：角色圖片，後台會顯示圖片預覽。
- `ElementSource` / `ElementPower` / `ElementHolderHistory`：元素來源、元素能力、歷任持有者。
- `Feedback`：使用者回饋，可標記 `New` / `Reviewed` / `Archived`，也可填寫 `admin_note` 做內部備註。

### 2. Reset Initial Content

新電腦、新資料庫，或 `db.sqlite3` 被刪掉後，可以先跑 migration，再載入預設內容：

```bash
cd NINJAMaster
python manage.py migrate
python manage.py seed_initial_content
```

如果想把角色、圖片、元素資料整批重建，使用：

```bash
python manage.py seed_initial_content --reset-content
```

注意：

- `--reset-content` 會刪除角色、角色圖片、元素資料、投票、收藏、時間線進度，再重新載入 fixture。
- `--reset-content` **不會刪除 Feedback**，避免使用者回饋被清掉。
- 預設內容來源是 `mainsite/fixtures/initial_content.json`。
- 不要把 `User`、`Feedback`、`CharacterVote`、`CharacterFavorite`、`TimelineProgress` dump 進預設 fixture，這些是使用者互動資料。
- 預設 fixture 裡的 `vote_count` 應維持 0，避免把本機測試票數帶到新資料庫。

更多簡短指令也可以看 `NINJAMaster/CONTENT_MAINTENANCE.md`。

Project Progress Update：  
---

⚠️⚠️ 注意 **看這裡** ⚠️⚠️

- 2026/05/26: Ninjago AI 助手與 Groq LLM API 串接完成。

> 新增 `mainsite/groq_assistant.py` 與 `POST /api/ninjago/ask/`，前端可在 `timeline.html` 直接詢問 Ninjago 世界觀問題。後端會先從本地時間線資料找出相關事件，再把精簡後的 context 傳給 Groq `llama-3.3-70b-versatile`，避免把 API key 暴露在瀏覽器，也降低模型亂猜的機率。回答會附帶來源事件 metadata，前端可連回對應時間線資料。

- 2026/05/26: 時間線資料 API、Markdown 轉 JSON pipeline 與 AI 搜尋保護完成。

> 新增 `/api/timeline/events/` 與 `python manage.py build_timeline_events`，可把 `data/sources/timeline/` 的 Markdown 來源整理成 `data/ninjago_timeline_events.json`。AI 助手支援中英文角色 / 物件別名，例如 `赤蘭 / Nya`、`勞埃德 / Lloyd`、`時間雙子 / Acronix / Krux`，也會攔截生日、身高、完整族譜等目前資料不足的問題，回覆「目前資料不足」而不是硬編答案。

- 2026/05/26: Docker、`.env` 與本機資料庫啟動流程更新。

> 新增 `.env.example`，Django settings 可讀取本機 `.env`，`docker-compose.yml` 也支援 `GROQ_API_KEY` 與 `GROQ_MODEL`。Docker container 啟動時會自動跑 migration、必要時載入預設內容，並可透過環境變數建立 admin 帳號。`NINJAMaster/db.sqlite3`、`.env`、`__pycache__` 與 `*.pyc` 已列入 ignore，避免把本機資料庫、密鑰或 Python cache commit 到 Git。

- 2026/05/12: 後台維護流程與預設內容 seed 指令完成。

> 新增 `mainsite/fixtures/initial_content.json` 作為角色、角色圖片、元素來源、元素能力與元素持有歷史的預設內容資料，並加入 `python manage.py seed_initial_content` 管理指令；新資料庫可一鍵載入預設內容，也可用 `--reset-content` 重建內容資料。Django Admin 同步強化角色圖片預覽、角色圖片數顯示，以及 Feedback 的 `New / Reviewed / Archived` 狀態與 `admin_note` 內部備註，方便管理者整理回饋。

- 2026/05/07: 個人化時間線書籤系統上線。

> 新增 `TimelineProgress` 資料表與 `/api/timeline/progress/` API，登入使用者可以在 `timeline.html` 的每個時間線事件上按「加入書籤」記錄目前看到的位置；每位使用者只會保留一個時間線書籤，新的書籤會取代舊書籤，也可以按「清除」移除。左側 `timeline-bookmark` 側邊欄會用 `★` 與黃色樣式標出目前書籤，`profile.html` 也會顯示「我的時間線書籤」。

- 2026/05/07: 忍者角色收藏系統完成。

> 新增 `CharacterFavorite` 資料表與 `POST /characters/<id>/favorite/` API，登入使用者可以在 `characters.html` 的角色卡片按「⭐ 收藏 / 已收藏」切換收藏狀態；未登入時會導向登入頁。`profile.html` 新增「我的收藏角色」區塊，會顯示目前帳號收藏的角色。

- 2026/05/06: 使用者登入、註冊、登出與個人檔案系統完成。

> 接上 Django auth，新增 `/login/`、`/register/`、`/logout/`、`/profile/` 與 `/api/auth/status/`。Navbar 的登入按鈕會依 session 狀態顯示「未登入」或目前使用者名稱，登入後 hover/focus 可展開「個人檔案」與「登出」。`profile.html` 作為使用者個人 dashboard，後續收藏角色與時間線書籤也會集中顯示在這裡。

- 2026/04/27: 在所有頁面加入BackTop（一鍵返回頂部）。

- 2026/04/14: Elements 頁面正式接上元素資料庫與歷任持有者資料。

> 新增 `ElementSource`、`ElementPower`、`ElementHolderHistory` 三張資料表，Elements 頁面的 popup 內容已改為由 Django / SQLite 動態讀取，會顯示元素描述、現任持有者與歷任持有者，查不到資料時會顯示「無資料」。

- 2026/04/14: Elements popup 可直接查看角色詳細資訊。

> 在元素 popup 的「歷年持有者」清單中，若該筆資料有對應的角色資料庫紀錄，點擊名字即可開啟角色詳細 modal；若只有文字資料、沒有角色主檔，則維持不可點擊狀態。

- 2026/04/14: Backend / Django 相容性修正完成。

> 修正 Elements 相關 API 與模型載入問題，並處理 Django 6 的 `CheckConstraint` 寫法相容性，避免 `runserver` 因 model constraint 參數錯誤而直接噴掉。

- 2026/04/13: Feedback 頁面、Feedback DB 與頁尾聯絡區完成。

> 新增聯絡 / 回饋頁面、`Feedback` 模型與對應資料表，前端表單資料可送進 Django 後端並寫入 SQLite，管理者也能從 Django Admin 查看收到的回饋內容。

- 2026/04/13: 首頁底部導覽與 Elements 頁面互動重新設計。

> 重新設計 bottom navigation / contact 區塊，並在 Elements 頁面加入來源龍徽章輪播、Source 詳細描述面板、點擊放大旋轉與點擊外部自動收合的互動流程。

- 2026/04/08: 角色人氣投票系統上線。

> 新增 `POST /characters/<id>/vote/` API，後端加入 `CharacterVote` 模型（同一 session 同一角色限投一次），前端按鈕投票後鎖定顯示「已投票」。

- 2026/04/08: 搜尋系統 UX 大幅強化。

> 1. 跨頁搜尋結果面板（取代自動跳轉），顯示各頁命中數 + 片段摘要 + 可點擊前往。
> 2. 本頁搜尋「上一筆 / 下一筆」導覽條，當前命中以紅底高亮。
> 3. 跨頁搜尋改為 `Promise.allSettled()` 平行請求，速度提升。
> 4. 即時搜尋（debounce 320ms），邊打字邊高亮，不跳頁。
> 5. 關鍵字歷史與建議（`localStorage` 記錄最近 10 筆）。

- 2026/04/05: 全域搜尋系統上線。

> 使用 GET 參數 `?q=關鍵字` 搜尋當前頁面內容，自動 Highlight 匹配文字並捲動到第一個結果，且會展開時間線隱藏條目、角色彈窗自動開啟、元素面板自動切換。新增 `css/search.css` 與 `action/search.js`。

- 2026/04/05: 時間線頁面內容完善。

> 補齊時間線全部歷史事件文字內容。

功能說明：

| 頁面 | 搜尋範圍 | 隱藏內容處理 |
| :-- | :-- | :--: |
| 首頁 | 所有文字 | 無 |
| 時間線 | `.tl-entry` 內文 | 強制 `.show` 展開 |
| 世界觀 | `.world-entry` 內文 | 無 |
| 元素 | `.source-panel` 內文 | 自動切換 panel |
| 角色 | `.character-profile` 內文 | 自動開啟 modal |

---

- 2026/03/31: Elements 頁面設計與資料庫連線。
- 2026/03/31: Database 建立與前端連接設定。
- 2026/03/30: 建立 Django 專案，並完成基本設定。 ```Admin的帳號密碼我放Line。```

---

- 2026/03/24: 專案結構重整，所有頁面的版面配置和動作分離。  
- 2026/03/24: 修正所有 HTML 檔案路徑，分頁已獨立到 ```src``` 資料夾。
- 2026/03/24: 新建 ```css``` 和 ```action``` 資料夾，所有分頁的 CSS 和 JS 皆已獨立。
- 2026/03/24: 所有檔案均已註解。

Project Rules:  
---

**老哥記得要先 ```git pull --rebase``` 再開始動工喔!!! (不然會出大事😱😱😱)**

> - 要編輯 **HTML** 的話，進[src資料夾](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/tree/main/src)修改 ```{各自的}.html```，不要修改[index.html](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/index.html)。  
> - 要改 **CSS** 的話，進[css資料夾](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/tree/main/css)修改 ```{各自的}.css```，不要修改[style.css](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/style.css)。  
> - **JS** 也一樣，進[action資料夾](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/tree/main/action)修改 ```{各自的}.js```，不要修改[script.js](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/script.js)。
> - [common.css](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/css/common.css)是所有分頁繼承[style.css](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/style.css)的通用架構。
> - [search.css](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/css/search.css) 和 [search.js](https://github.com/AustinYanSebasmannAlderhaz/114-2_WebAPP_Team14/blob/main/action/search.js) 是全域搜尋系統，所有頁面皆引用。
> - `.env` 只能放在本機，裡面可能有 `GROQ_API_KEY`、admin password 等密鑰，不能 commit。
> - `NINJAMaster/db.sqlite3` 是本機開發資料庫，不要 commit；新環境請用 `python manage.py migrate` 和 `python manage.py seed_initial_content` 重建。
> - `__pycache__/`、`*.pyc`、虛擬環境資料夾、Docker 測試產物都不要 commit。
> - 如果 `git pull` 出現 divergent branches，請先用 `git status` 看狀態；一般情況使用 `git pull --rebase`。如果已經進入 conflict，不要一直重複 pull，先把 conflict 解完再繼續。
