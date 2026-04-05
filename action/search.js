/**
 * search.js
 * Global search system for the Ninjago Archive.
 *
 * Reads the GET parameter `?q=keyword` and:
 *  1. Highlights every matching text node with <mark class="search-highlight">
 *  2. Reveals hidden content (timeline entries, character modals, element panels)
 *  3. Scrolls to the first match
 *  4. Shows a toast with the result count
 *
 * The magnifying-glass button toggles an expandable search input.
 * Pressing Enter navigates to the same page with `?q=` appended.
 */

document.addEventListener('DOMContentLoaded', () => {
    /* ------------------------------------------------------------------ */
    /*  1. Search toggle UI — open/close the search input                 */
    /* ------------------------------------------------------------------ */
    const wrapper = document.querySelector('.search-wrapper');
    const toggle = document.querySelector('.search-toggle');
    const input = document.querySelector('.search-input');

    if (toggle && wrapper && input) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('is-open');
            if (isOpen) {
                // Auto-focus the input so user can type immediately
                input.focus();
            }
        });

        // Submit search on Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = input.value.trim();
                if (query.length > 0) {
                    navigateWithQuery(query);
                }
            }
            // Close search box on Escape
            if (e.key === 'Escape') {
                wrapper.classList.remove('is-open');
            }
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
    }

    if (!query) return; // Nothing to search

    // Short delay to let page-specific JS (timeline formatting, etc.) finish
    setTimeout(() => {
        executeSearch(query);
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
    // Determine which page we are on to apply page-specific logic
    const path = window.location.pathname;

    // Reveal hidden content BEFORE highlighting
    revealHiddenContent(query, path);

    // Walk the DOM and highlight matching text nodes
    const matchCount = highlightMatches(document.body, query);

    if (matchCount > 0) {
        // Found results on current page
        showToast(matchCount, query);
        scrollToFirstMatch();
    } else {
        // No results on current page — try cross-page search
        showToast(0, query, true); // show "searching other pages…" message
        searchOtherPages(query, path);
    }
}


/* ====================================================================== */
/*  Cross-page search: fetch other pages and redirect to first match      */
/* ====================================================================== */

// All searchable pages with their absolute paths from site root
const ALL_PAGES = [
    { url: '/index.html',          label: '首頁' },
    { url: '/src/timeline.html',   label: '時間線' },
    { url: '/src/world.html',      label: '世界觀' },
    { url: '/src/elements.html',   label: '元素力量' },
    { url: '/characters/',         label: '角色' },
];

async function searchOtherPages(query, currentPath) {
    const lowerQuery = query.toLowerCase();

    // Filter out the current page to avoid searching it again
    const otherPages = ALL_PAGES.filter((page) => {
        return !currentPath.endsWith(page.url) &&
               !(currentPath === '/' && page.url === '/index.html');
    });

    for (const page of otherPages) {
        try {
            const response = await fetch(page.url);
            if (!response.ok) continue;

            const html = await response.text();

            // Parse the HTML and extract text content (skip scripts/styles)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Remove script and style elements before extracting text
            doc.querySelectorAll('script, style, nav').forEach((el) => el.remove());
            const textContent = doc.body?.textContent?.toLowerCase() || '';

            if (textContent.includes(lowerQuery)) {
                // Found a match on another page — redirect there
                const targetUrl = new URL(page.url, window.location.origin);
                targetUrl.searchParams.set('q', query);
                window.location.href = targetUrl.toString();
                return;
            }
        } catch (err) {
            // Silently skip pages that fail to load (e.g. network error)
            console.warn(`[Search] Skipped ${page.url}:`, err);
        }
    }

    // No results found on any page
    showToast(0, query, false);
}


/* ====================================================================== */
/*  Reveal hidden content depending on the current page                   */
/* ====================================================================== */
function revealHiddenContent(query, path) {
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
        if (firstMatch) {
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
/*  Scroll to the first <mark> on the page                               */
/* ====================================================================== */
function scrollToFirstMatch() {
    const firstMark = document.querySelector('mark.search-highlight');
    if (firstMark) {
        // Offset for sticky navbar height (~80px)
        const navHeight = document.querySelector('.navbar')?.offsetHeight || 80;
        const top = firstMark.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
    }
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
