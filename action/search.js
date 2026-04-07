/**
 * search.js
 * Global search system for the Ninjago Archive.
 *
 * Reads the GET parameter `?q=keyword` and:
 *  1. Highlights every matching text node with <mark class="search-highlight">
 *  2. Reveals hidden content (timeline entries, character modals, element panels)
 *  3. Provides previous/next navigation across all matches
 *  4. Shows a toast with the result count
 *  5. When current page has no match, shows cross-page result panel
 *
 * The magnifying-glass button toggles an expandable search input.
 * Pressing Enter navigates to the same page with `?q=` appended.
 */

const searchState = {
    marks: [],
    activeIndex: -1,
};

const LIVE_SEARCH_DEBOUNCE_MS = 320;
const SEARCH_HISTORY_KEY = 'ninweb_search_history_v1';
const SEARCH_HISTORY_LIMIT = 10;

// All searchable pages with their absolute paths from site root
const ALL_PAGES = [
    { url: '/index.html', label: '首頁' },
    { url: '/src/timeline.html', label: '時間線' },
    { url: '/src/world.html', label: '世界觀' },
    { url: '/src/elements.html', label: '元素力量' },
    { url: '/characters/', label: '角色' },
];

document.addEventListener('DOMContentLoaded', () => {
    /* ------------------------------------------------------------------ */
    /*  1. Search toggle UI — open/close the search input                 */
    /* ------------------------------------------------------------------ */
    const wrapper = document.querySelector('.search-wrapper');
    const toggle = document.querySelector('.search-toggle');
    const input = document.querySelector('.search-input');
    const liveCountNode = wrapper ? ensureLiveCountNode(wrapper) : null;
    let liveSearchTimer = null;

    if (toggle && wrapper && input) {
        initializeSuggestionList(input);
        updateSuggestionOptions(input, '');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('is-open');
            if (isOpen) {
                // Auto-focus the input so user can type immediately
                input.focus();
                updateSuggestionOptions(input, input.value.trim());
            }
        });

        // Submit search on Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = input.value.trim();
                if (query.length > 0) {
                    saveSearchHistory(query);
                    navigateWithQuery(query);
                }
            }
            // Close search box on Escape
            if (e.key === 'Escape') {
                wrapper.classList.remove('is-open');
            }
        });

        // Live search: debounce and preview result count on current page
        input.addEventListener('input', () => {
            const query = input.value.trim();
            updateSuggestionOptions(input, query);

            if (liveSearchTimer) {
                clearTimeout(liveSearchTimer);
            }

            liveSearchTimer = setTimeout(() => {
                if (!query) {
                    resetSearchUi();
                    setLiveCountText(liveCountNode, '');
                    return;
                }
                executeLiveSearch(query);
                setLiveCountText(liveCountNode, `本頁找到 ${searchState.marks.length} 筆，按 Enter 全站搜尋`);
            }, LIVE_SEARCH_DEBOUNCE_MS);
        });

        // Show history suggestions when focused
        input.addEventListener('focus', () => {
            updateSuggestionOptions(input, input.value.trim());
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('is-open');
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  2. Read GET parameter and execute search                          */
    /* ------------------------------------------------------------------ */
    const params = new URLSearchParams(window.location.search);
    const query = (params.get('q') || '').trim();

    // Pre-fill the search input with the current query
    if (input && query) {
        input.value = query;
        updateSuggestionOptions(input, query);
    }

    if (!query) return; // Nothing to search

    // Short delay to let page-specific JS (timeline formatting, etc.) finish
    setTimeout(() => {
        executeSearch(query);
        saveSearchHistory(query);
    }, 350);
});


/* ====================================================================== */
/*  Navigate to the current page with ?q=keyword                          */
/* ====================================================================== */
function navigateWithQuery(query) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.location.href = url.toString();
}


/* ====================================================================== */
/*  Main search execution                                                 */
/* ====================================================================== */
function executeSearch(query) {
    resetSearchUi();

    // Determine which page we are on to apply page-specific logic
    const path = window.location.pathname;

    // Reveal hidden content BEFORE highlighting
    revealHiddenContent(query, path);

    // Walk the DOM and highlight matching text nodes
    const matchCount = highlightMatches(document.body, query);
    const marks = Array.from(document.querySelectorAll('mark.search-highlight'));
    setupMatchNavigator(marks);

    if (matchCount > 0) {
        // Found results on current page
        showToast(matchCount, query);
        jumpToMatch(0);
        // Also search other pages and show cross-page panel (without overriding current-page toast)
        searchOtherPages(query, path, { panelOnly: true });
    } else {
        // No results on current page — try cross-page search
        showToast(0, query, true); // show "searching other pages…" message
        searchOtherPages(query, path, { panelOnly: false });
    }
}

function executeLiveSearch(query) {
    resetSearchUi({ keepToast: true });

    const path = window.location.pathname;
    revealHiddenContent(query, path, { autoOpenCharacterModal: false });

    highlightMatches(document.body, query);
    const marks = Array.from(document.querySelectorAll('mark.search-highlight'));
    setupMatchNavigator(marks);

    if (marks.length > 0) {
        jumpToMatch(0, { scroll: false });
    }
}


/* ====================================================================== */
/*  Cross-page search: fetch pages in parallel and render result panel     */
/* ====================================================================== */

async function searchOtherPages(query, currentPath, options = {}) {
    const { panelOnly = false } = options;
    const lowerQuery = query.toLowerCase();
    const currentNormalized = normalizePath(currentPath);

    // Filter out the current page to avoid searching it again
    const otherPages = ALL_PAGES.filter((page) => {
        return normalizePath(page.url) !== currentNormalized;
    });

    // Parallel cross-page fetch for better response time
    const settled = await Promise.allSettled(
        otherPages.map((page) => fetchPageMatchInfo(page, lowerQuery, query))
    );

    const matches = [];
    settled.forEach((result) => {
        if (result.status === 'fulfilled' && result.value && result.value.count > 0) {
            matches.push(result.value);
        }
    });

    matches.sort((a, b) => b.count - a.count);

    if (matches.length > 0) {
        showSearchResultsPanel(query, matches);
        if (!panelOnly) {
            const totalMatches = matches.reduce((sum, item) => sum + item.count, 0);
            showToast(totalMatches, query);
        }
        return;
    }

    // No results found on any page
    removeSearchResultsPanel();
    if (!panelOnly) {
        showToast(0, query, false);
    }
}

async function fetchPageMatchInfo(page, lowerQuery, originalQuery) {
    try {
        const response = await fetch(page.url);
        if (!response.ok) {
            return null;
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove noisy areas before text extraction
        doc.querySelectorAll('script, style, nav').forEach((el) => el.remove());

        const rawText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!rawText) {
            return null;
        }

        const lowerText = rawText.toLowerCase();
        const count = countOccurrences(lowerText, lowerQuery);
        if (count === 0) {
            return null;
        }

        const snippet = extractSnippet(rawText, lowerText, lowerQuery);
        const targetUrl = new URL(page.url, window.location.origin);
        targetUrl.searchParams.set('q', originalQuery);

        return {
            ...page,
            count,
            snippet,
            href: targetUrl.toString(),
        };
    } catch (err) {
        console.warn(`[Search] Skipped ${page.url}:`, err);
        return null;
    }
}


/* ====================================================================== */
/*  Reveal hidden content depending on the current page                   */
/* ====================================================================== */
function revealHiddenContent(query, path, options = {}) {
    const { autoOpenCharacterModal = true } = options;
    const lowerQuery = query.toLowerCase();

    /* --- Timeline page: force-show all tl-entry so they are searchable --- */
    if (path.includes('timeline')) {
        document.querySelectorAll('.tl-entry').forEach((entry) => {
            entry.classList.add('show');
        });
    }

    /* --- Characters page: open modal for first matching character card --- */
    if (path.includes('characters')) {
        const cards = document.querySelectorAll('[data-carousel]');
        cards.forEach((card) => {
            // Collect all searchable text from data attributes + visible text
            const searchableText = [
                card.dataset.name,
                card.dataset.gender,
                card.dataset.affiliation,
                card.dataset.homeland,
                card.dataset.occupation,
                card.dataset.element,
                card.dataset.firstAppearance,
                card.dataset.description,
                card.textContent
            ].join(' ').toLowerCase();

            if (searchableText.includes(lowerQuery)) {
                // Mark this card so we can highlight inside the modal later
                card.classList.add('search-matched');
            }
        });

        // Auto-open the first matched card's modal
        const firstMatch = document.querySelector('[data-carousel].search-matched');
        if (firstMatch && autoOpenCharacterModal) {
            firstMatch.click();
        }
    }

    /* --- Elements page: switch to the panel that contains the match --- */
    if (path.includes('elements')) {
        const panels = document.querySelectorAll('[data-source-panel]');
        const badges = document.querySelectorAll('[data-source]');

        panels.forEach((panel) => {
            if (panel.textContent.toLowerCase().includes(lowerQuery)) {
                // Activate this panel
                panels.forEach((p) => p.classList.remove('is-active'));
                panel.classList.add('is-active');

                // Activate the corresponding badge
                const panelKey = panel.dataset.sourcePanel;
                badges.forEach((b) => {
                    b.classList.toggle('is-active', b.dataset.source === panelKey);
                });
            }
        });
    }
}


/* ====================================================================== */
/*  Walk text nodes and wrap matches with <mark>                          */
/* ====================================================================== */
function highlightMatches(root, query) {
    const lowerQuery = query.toLowerCase();
    let matchCount = 0;

    // Collect all text nodes first to avoid live-DOM mutation issues
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            // Skip script, style, and already-highlighted nodes
            const tag = node.parentElement?.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') {
                return NodeFilter.FILTER_REJECT;
            }
            // Skip the search input itself
            if (node.parentElement?.classList.contains('search-input')) {
                return NodeFilter.FILTER_REJECT;
            }
            // Skip invisible nodes (navbar search wrapper text etc.)
            if (node.textContent.toLowerCase().includes(lowerQuery)) {
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
        }
    });

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    // Replace each matching text node with highlighted fragments
    textNodes.forEach((textNode) => {
        const parent = textNode.parentNode;
        if (!parent) return;

        const text = textNode.textContent;
        const lowerText = text.toLowerCase();
        const fragments = [];
        let lastIndex = 0;

        // Find all occurrences of the query in this text node
        let searchIndex = lowerText.indexOf(lowerQuery, lastIndex);
        while (searchIndex !== -1) {
            // Text before the match
            if (searchIndex > lastIndex) {
                fragments.push(document.createTextNode(text.slice(lastIndex, searchIndex)));
            }
            // The matched portion wrapped in <mark>
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = text.slice(searchIndex, searchIndex + query.length);
            fragments.push(mark);

            matchCount++;
            lastIndex = searchIndex + query.length;
            searchIndex = lowerText.indexOf(lowerQuery, lastIndex);
        }

        // Remaining text after last match
        if (lastIndex < text.length) {
            fragments.push(document.createTextNode(text.slice(lastIndex)));
        }

        // Replace original text node with the fragments
        if (fragments.length > 0) {
            const container = document.createDocumentFragment();
            fragments.forEach((f) => container.appendChild(f));
            parent.replaceChild(container, textNode);
        }
    });

    return matchCount;
}


/* ====================================================================== */
/*  Match navigator (previous/next)                                       */
/* ====================================================================== */
function setupMatchNavigator(marks) {
    removeMatchNavigator();
    searchState.marks = marks;
    searchState.activeIndex = -1;

    if (!marks || marks.length === 0) {
        return;
    }

    const nav = document.createElement('div');
    nav.className = 'search-nav';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', '搜尋結果導覽');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'search-nav-btn';
    prev.setAttribute('aria-label', '上一筆搜尋結果');
    prev.textContent = '上一筆';
    prev.addEventListener('click', () => moveMatch(-1));

    const count = document.createElement('span');
    count.className = 'search-nav-count';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'search-nav-btn';
    next.setAttribute('aria-label', '下一筆搜尋結果');
    next.textContent = '下一筆';
    next.addEventListener('click', () => moveMatch(1));

    nav.append(prev, count, next);
    document.body.appendChild(nav);
    updateMatchCounter();
}

function removeMatchNavigator() {
    const nav = document.querySelector('.search-nav');
    if (nav) {
        nav.remove();
    }
    searchState.marks.forEach((mark) => mark.classList.remove('is-active'));
    searchState.marks = [];
    searchState.activeIndex = -1;
}

function moveMatch(step) {
    const total = searchState.marks.length;
    if (total === 0) return;

    let target = searchState.activeIndex + step;
    if (target < 0) target = total - 1;
    if (target >= total) target = 0;
    jumpToMatch(target);
}

function jumpToMatch(index, options = {}) {
    const { scroll = true } = options;
    const total = searchState.marks.length;
    if (total === 0) return;

    const safeIndex = Math.max(0, Math.min(index, total - 1));
    const previous = searchState.marks[searchState.activeIndex];
    if (previous) {
        previous.classList.remove('is-active');
    }

    const target = searchState.marks[safeIndex];
    if (!target) return;

    target.classList.add('is-active');
    searchState.activeIndex = safeIndex;
    updateMatchCounter();

    // Offset for sticky navbar height (~80px)
    if (scroll) {
        const navHeight = document.querySelector('.navbar')?.offsetHeight || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

function updateMatchCounter() {
    const node = document.querySelector('.search-nav-count');
    if (!node) return;

    const total = searchState.marks.length;
    if (total === 0) {
        node.textContent = '0 / 0';
        return;
    }

    const current = searchState.activeIndex >= 0 ? searchState.activeIndex + 1 : 0;
    node.textContent = `${current} / ${total}`;
}


/* ====================================================================== */
/*  Toast notification showing result count                               */
/*  @param {boolean|undefined} searching - true = still searching others  */
/* ====================================================================== */
function showToast(count, query, searching) {
    // Remove any existing toast
    const existing = document.querySelector('.search-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'search-toast';

    if (count > 0) {
        toast.textContent = `找到 ${count} 個有關「${query}」的結果`;
    } else if (searching) {
        toast.textContent = `此頁面沒有結果，正在搜尋其他頁面…`;
    } else {
        toast.textContent = `所有頁面皆沒有找到有關「${query}」的內容`;
    }

    document.body.appendChild(toast);

    // Trigger show animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-hide after 4 seconds (skip if still searching)
    if (!searching) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
}

function clearToast() {
    const existing = document.querySelector('.search-toast');
    if (existing) existing.remove();
}


/* ====================================================================== */
/*  Search result panel (cross-page)                                      */
/* ====================================================================== */
function showSearchResultsPanel(query, matches) {
    removeSearchResultsPanel();

    const panel = document.createElement('aside');
    panel.className = 'search-results-panel';
    panel.setAttribute('aria-label', '跨頁搜尋結果');

    const head = document.createElement('div');
    head.className = 'search-results-head';

    const title = document.createElement('h4');
    title.className = 'search-results-title';
    title.textContent = `「${query}」在其他頁面的結果`;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'search-results-close';
    close.setAttribute('aria-label', '關閉搜尋結果面板');
    close.textContent = '關閉';
    close.addEventListener('click', () => panel.remove());

    head.append(title, close);

    const list = document.createElement('div');
    list.className = 'search-results-list';

    matches.forEach((match) => {
        const item = document.createElement('a');
        item.className = 'search-result-item';
        item.href = match.href;

        const top = document.createElement('div');
        top.className = 'search-result-top';

        const page = document.createElement('span');
        page.className = 'search-result-page';
        page.textContent = match.label;

        const count = document.createElement('span');
        count.className = 'search-result-count';
        count.textContent = `${match.count} 筆`;

        top.append(page, count);

        const snippet = document.createElement('p');
        snippet.className = 'search-result-snippet';
        snippet.textContent = match.snippet;

        item.append(top, snippet);
        list.appendChild(item);
    });

    panel.append(head, list);
    document.body.appendChild(panel);
}

function removeSearchResultsPanel() {
    const panel = document.querySelector('.search-results-panel');
    if (panel) {
        panel.remove();
    }
}

function resetSearchUi(options = {}) {
    const { keepToast = false } = options;
    removeMatchNavigator();
    removeSearchResultsPanel();
    clearHighlights();
    document.querySelectorAll('.search-matched').forEach((el) => el.classList.remove('search-matched'));
    if (!keepToast) {
        clearToast();
    }
}

function clearHighlights() {
    const marks = Array.from(document.querySelectorAll('mark.search-highlight'));
    marks.forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
    });
}


/* ====================================================================== */
/*  Utilities                                                             */
/* ====================================================================== */
function normalizePath(path) {
    if (!path || path === '/') return '/index.html';
    return path.endsWith('/') ? path.slice(0, -1) : path;
}

function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    let count = 0;
    let index = haystack.indexOf(needle);
    while (index !== -1) {
        count += 1;
        index = haystack.indexOf(needle, index + needle.length);
    }
    return count;
}

function extractSnippet(originalText, lowerText, lowerQuery) {
    const hit = lowerText.indexOf(lowerQuery);
    if (hit === -1) {
        return originalText.slice(0, 120);
    }
    const start = Math.max(0, hit - 45);
    const end = Math.min(originalText.length, hit + lowerQuery.length + 70);
    const snippet = originalText.slice(start, end).trim();
    const prefix = start > 0 ? '…' : '';
    const suffix = end < originalText.length ? '…' : '';
    return `${prefix}${snippet}${suffix}`;
}

function getSearchHistory() {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : [];
    } catch (err) {
        return [];
    }
}

function saveSearchHistory(query) {
    const normalized = query.trim();
    if (!normalized) return;

    const list = getSearchHistory();
    const next = [normalized, ...list.filter((item) => item !== normalized)].slice(0, SEARCH_HISTORY_LIMIT);

    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    } catch (err) {
        // Ignore storage errors (private mode / storage disabled)
    }
}

function initializeSuggestionList(input) {
    const existing = document.getElementById('search-history-list');
    const dataList = existing || document.createElement('datalist');
    dataList.id = 'search-history-list';
    if (!existing) {
        document.body.appendChild(dataList);
    }
    input.setAttribute('list', dataList.id);
}

function updateSuggestionOptions(input, keyword) {
    const dataList = document.getElementById('search-history-list');
    if (!dataList) return;

    const trimmed = (keyword || '').toLowerCase();
    const filtered = getSearchHistory().filter((item) => item.toLowerCase().includes(trimmed));

    dataList.innerHTML = '';
    filtered.slice(0, SEARCH_HISTORY_LIMIT).forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        dataList.appendChild(option);
    });
}

function ensureLiveCountNode(wrapper) {
    let node = wrapper.querySelector('.search-live-count');
    if (!node) {
        node = document.createElement('div');
        node.className = 'search-live-count';
        wrapper.appendChild(node);
    }
    return node;
}

function setLiveCountText(node, text) {
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('is-visible', Boolean(text));
}
