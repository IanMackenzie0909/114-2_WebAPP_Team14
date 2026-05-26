/**
 * timeline.js
 * JavaScript for the Timeline page (src/timeline.html).
 *
 * Reveals timeline entries, builds the bookmark rail, and lets signed-in users
 * save one personal "current progress" bookmark.
 */

document.addEventListener('DOMContentLoaded', () => {
    const getCsrfToken = () => {
        const cookieValue = document.cookie
            .split(';')
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('csrftoken='));
        return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
    };

    const formatTimelineContent = () => {
        const entryParagraphs = document.querySelectorAll('.tl-entry > p');

        entryParagraphs.forEach((paragraph) => {
            const rawText = (paragraph.innerText || '').replace(/\r/g, '').trim();
            if (!rawText) return;

            const lines = rawText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);

            const content = document.createElement('div');
            content.className = 'tl-content';

            let listEl = null;
            const flushList = () => {
                listEl = null;
            };

            lines.forEach((line) => {
                if (line.startsWith('### ')) {
                    flushList();
                    const subTitle = document.createElement('h4');
                    subTitle.textContent = line.replace(/^###\s+/, '').trim();
                    content.appendChild(subTitle);
                    return;
                }

                if (line.startsWith('#### ')) {
                    flushList();
                    const subSection = document.createElement('h5');
                    subSection.textContent = line.replace(/^####\s+/, '').trim();
                    content.appendChild(subSection);
                    return;
                }

                if (/^[-*•]\s+/.test(line)) {
                    if (!listEl) {
                        listEl = document.createElement('ul');
                        listEl.className = 'tl-list';
                        content.appendChild(listEl);
                    }
                    const item = document.createElement('li');
                    item.textContent = line.replace(/^[-*•]\s+/, '').trim();
                    listEl.appendChild(item);
                    return;
                }

                flushList();
                const text = document.createElement('p');
                text.className = 'tl-text';
                text.textContent = line;
                content.appendChild(text);
            });

            paragraph.replaceWith(content);
        });
    };

    formatTimelineContent();

    const setupTimelineBookmarks = () => {
        const list = document.getElementById('timeline-bookmark-list');
        if (!list) return;

        const headings = Array.from(
            document.querySelectorAll('section.section.dark h2, section.section.dark .tl-entry h3')
        );
        if (headings.length === 0) return;

        const usedIds = new Set();
        const makeSlug = (text) => {
            const slug = (text || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, '')
                .replace(/\s+/g, '-');
            return slug || '';
        };

        const ensureId = (heading, index) => {
            const existing = (heading.id || '').trim();
            if (existing && !usedIds.has(existing)) {
                usedIds.add(existing);
                return existing;
            }

            const base = makeSlug(heading.textContent) || `timeline-anchor-${index + 1}`;
            let nextId = base;
            let i = 2;
            while (usedIds.has(nextId) || document.getElementById(nextId)) {
                nextId = `${base}-${i}`;
                i += 1;
            }

            heading.id = nextId;
            usedIds.add(nextId);
            return nextId;
        };

        const linksById = new Map();

        headings.forEach((heading, index) => {
            const id = ensureId(heading, index);

            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = `timeline-bookmark-link ${heading.tagName === 'H2' ? 'h2-link' : 'h3-link'}`;
            link.href = `#${id}`;
            link.textContent = (heading.textContent || '').trim();
            link.addEventListener('click', (event) => {
                event.preventDefault();
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${id}`);
            });

            item.appendChild(link);
            list.appendChild(item);
            linksById.set(id, link);
        });

        let activeId = '';
        const updateActive = () => {
            const markerTop = 150;
            let nextActiveId = headings[0]?.id || '';

            headings.forEach((heading) => {
                const rect = heading.getBoundingClientRect();
                if (rect.top - markerTop <= 0) {
                    nextActiveId = heading.id;
                }
            });

            if (!nextActiveId || nextActiveId === activeId) return;
            activeId = nextActiveId;

            linksById.forEach((link, id) => {
                link.classList.toggle('is-active', id === nextActiveId);
            });
        };

        window.addEventListener('scroll', updateActive, { passive: true });
        updateActive();
    };

    setupTimelineBookmarks();

    const setupNinjagoAssistant = () => {
        const form = document.querySelector('[data-assistant-form]');
        const input = document.querySelector('[data-assistant-input]');
        const messages = document.querySelector('[data-assistant-messages]');
        const sources = document.querySelector('[data-assistant-sources]');
        const status = document.querySelector('[data-assistant-status]');
        if (!form || !input || !messages || !sources || !status) return;

        const setStatus = (value) => {
            status.textContent = value;
        };

        const addMessage = (text, type) => {
            const message = document.createElement('div');
            message.className = `assistant-message assistant-message-${type}`;
            message.textContent = text;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
            return message;
        };

        const stripInlineSources = (answer) => {
            return (answer || '')
                .replace(/\n*\s*資料來源\s*[:：][\s\S]*$/u, '')
                .trim();
        };

        const renderSources = (items) => {
            sources.innerHTML = '';
            if (!Array.isArray(items) || items.length === 0) return;

            items.forEach((item) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'assistant-source';
                button.textContent = `${item.id || 'source'} · ${item.title || ''}`;
                button.addEventListener('click', () => {
                    const title = item.title || '';
                    const heading = Array.from(document.querySelectorAll('.tl-entry h3'))
                        .find((node) => (node.textContent || '').trim() === title);
                    if (heading) {
                        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                sources.appendChild(button);
            });
        };

        const ensureCsrfToken = async () => {
            if (getCsrfToken()) return;

            try {
                await fetch('/api/auth/status/', {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                    },
                });
            } catch (error) {
                // The POST below will surface the actual error if CSRF setup failed.
            }
        };

        const askQuestion = async (question) => {
            const trimmed = question.trim();
            if (!trimmed) return;

            addMessage(trimmed, 'user');
            input.value = '';
            input.disabled = true;
            form.querySelector('button[type="submit"]').disabled = true;
            setStatus('Thinking');
            renderSources([]);
            const pending = addMessage('整理時間線資料中...', 'assistant');

            try {
                await ensureCsrfToken();
                const response = await fetch('/api/ninjago/ask/', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ question: trimmed }),
                });
                const data = await response.json();
                if (!response.ok || !data.ok) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                pending.textContent = stripInlineSources(data.answer) || '目前沒有回答。';
                renderSources(data.sources || []);
                setStatus(data.model || 'Ready');
            } catch (error) {
                pending.textContent = `無法取得 AI 回答：${error.message}`;
                setStatus('Error');
            } finally {
                input.disabled = false;
                form.querySelector('button[type="submit"]').disabled = false;
                input.focus();
            }
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            askQuestion(input.value);
        });

        document.querySelectorAll('[data-question]').forEach((button) => {
            button.addEventListener('click', () => {
                askQuestion(button.dataset.question || button.textContent || '');
            });
        });
    };

    setupNinjagoAssistant();

    const setupPersonalTimelineBookmark = async () => {
        const entries = Array.from(document.querySelectorAll('.tl-entry'));
        if (entries.length === 0) return;

        const getEntryMeta = (entry, index) => {
            const titleNode = entry.querySelector('h3');
            const sectionTitle = entry.closest('section')?.querySelector('h2')?.textContent?.trim() || '';
            const title = titleNode?.textContent?.trim() || `Timeline ${index + 1}`;
            const key = titleNode?.id || `timeline-entry-${index + 1}`;

            return { key, title, sectionTitle };
        };

        const setBookmarkLink = (bookmarkKey) => {
            document.querySelectorAll('.timeline-bookmark-link').forEach((link) => {
                link.classList.toggle('is-user-bookmark', link.getAttribute('href') === `#${bookmarkKey}`);
            });
        };

        const setBookmarkedEntry = (bookmarkKey) => {
            entries.forEach((entry) => {
                const isBookmarked = Boolean(bookmarkKey) && entry.dataset.timelineKey === bookmarkKey;
                entry.classList.toggle('is-bookmarked', isBookmarked);
                entry.dataset.isBookmarked = isBookmarked ? 'true' : 'false';

                const label = entry.querySelector('[data-bookmark-current]');
                if (label) {
                    label.textContent = isBookmarked ? '目前書籤：這裡' : '尚未加入書籤';
                }

                const addButton = entry.querySelector('[data-bookmark-add]');
                if (addButton) {
                    addButton.classList.toggle('is-active', isBookmarked);
                    addButton.setAttribute('aria-pressed', isBookmarked ? 'true' : 'false');
                    addButton.textContent = isBookmarked ? '已加入書籤' : '加入書籤';
                }
            });

            setBookmarkLink(bookmarkKey);
        };

        const redirectToLogin = () => {
            const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            window.location.href = `/login/?next=${encodeURIComponent(next)}`;
        };

        let isAuthenticated = false;
        let bookmarkKey = '';

        try {
            const response = await fetch('/api/timeline/progress/', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                isAuthenticated = Boolean(data.authenticated);
                bookmarkKey = data.bookmark?.timeline_key || '';
            }
        } catch (error) {
            bookmarkKey = '';
        }

        entries.forEach((entry, index) => {
            const meta = getEntryMeta(entry, index);
            entry.dataset.timelineKey = meta.key;

            const controls = document.createElement('div');
            controls.className = 'timeline-progress';
            controls.innerHTML = `
                <div class="timeline-progress-head">
                    <span data-bookmark-current>尚未加入書籤</span>
                </div>
                <div class="timeline-progress-actions" aria-label="個人時間線書籤">
                    <button type="button" data-bookmark-add aria-pressed="false">加入書籤</button>
                    <button type="button" data-bookmark-clear>清除</button>
                </div>
            `;

            entry.appendChild(controls);

            controls.addEventListener('click', async (event) => {
                const button = event.target.closest('button');
                if (!button) return;

                if (!isAuthenticated) {
                    redirectToLogin();
                    return;
                }

                const nextStatus = button.hasAttribute('data-bookmark-clear') ? '' : 'bookmarked';
                controls.querySelectorAll('button').forEach((action) => {
                    action.disabled = true;
                });

                try {
                    const response = await fetch('/api/timeline/progress/', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                            Accept: 'application/json',
                        },
                        body: JSON.stringify({
                            timeline_key: meta.key,
                            title: meta.title,
                            section_title: meta.sectionTitle,
                            status: nextStatus,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    bookmarkKey = data.bookmark?.timeline_key || '';
                    setBookmarkedEntry(bookmarkKey);
                } catch (error) {
                    setBookmarkedEntry(bookmarkKey);
                } finally {
                    controls.querySelectorAll('button').forEach((action) => {
                        action.disabled = false;
                    });
                }
            });
        });

        setBookmarkedEntry(bookmarkKey);
    };

    setupPersonalTimelineBookmark();

    const entries = document.querySelectorAll('.tl-entry');
    const io = new IntersectionObserver((items) => {
        items.forEach((item) => {
            if (item.isIntersecting) {
                item.target.classList.add('show');
            }
        });
    }, { threshold: 0.15 });

    entries.forEach((entry) => io.observe(entry));
});
