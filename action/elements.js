/**
 * elements.js
 * JavaScript for the Elements page (src/elements.html).
 */

document.addEventListener('DOMContentLoaded', () => {
    const ELEMENT_API_URL = '/api/elements/powers/';

    const orbitTrack = document.querySelector('[data-orbit-track]');
    const panels = Array.from(document.querySelectorAll('.source-panel[data-source-panel]'));
    const sourceLane = orbitTrack ? orbitTrack.querySelector('[data-source-lane]') : null;
    const sourceDetailPanel = document.querySelector('.source-detail-panel');
    const sourceDetailClose = document.getElementById('source-detail-close');
    const elementsOverlay = document.getElementById('elements-overlay');
    const elementPopup = document.getElementById('element-popup');
    const elementPopupTitle = document.getElementById('element-popup-title');
    const elementPopupDescription = document.getElementById('element-popup-description');
    const elementPopupHistory = document.getElementById('element-popup-history');
    const elementPopupClose = document.getElementById('element-popup-close');
    const elementButtons = Array.from(document.querySelectorAll('.element[data-element-name]'));

    if (!orbitTrack || !sourceLane || panels.length === 0 || !sourceDetailPanel) return;

    const clonedLane = sourceLane.cloneNode(true);
    clonedLane.classList.add('is-clone');
    clonedLane.setAttribute('aria-hidden', 'true');
    clonedLane.querySelectorAll('.source-badge').forEach((badge) => {
        badge.tabIndex = -1;
    });
    orbitTrack.appendChild(clonedLane);

    const keyboardBadges = Array.from(sourceLane.querySelectorAll('.source-badge[data-source]'));
    const allBadges = Array.from(orbitTrack.querySelectorAll('.source-badge[data-source]'));
    if (keyboardBadges.length === 0 || allBadges.length === 0) return;

    const state = {
        activeSource: null,
        activeElement: null,
    };

    const elementDataMap = new Map();
    let elementDataPromise = null;

    const normalizeKey = (value) => (value || '').toString().trim().toLowerCase().replace(/\s+/g, '-');

    const extractParenthesisToken = (value) => {
        const text = (value || '').toString();
        const match = text.match(/\(([^)]+)\)/);
        return match ? normalizeKey(match[1]) : '';
    };

    const buildLookupKeys = ({ code, name, buttonClassKey, buttonLabel }) => {
        const keySet = new Set();
        const rawName = (name || '').toString();
        const nameWithoutParen = rawName.replace(/\([^)]*\)/g, '').trim();

        if (code) keySet.add(normalizeKey(code));
        if (rawName) keySet.add(normalizeKey(rawName));
        if (nameWithoutParen) keySet.add(normalizeKey(nameWithoutParen));

        const tokenFromName = extractParenthesisToken(rawName);
        if (tokenFromName) keySet.add(tokenFromName);

        if (buttonClassKey) keySet.add(normalizeKey(buttonClassKey));
        if (buttonLabel) keySet.add(normalizeKey(buttonLabel));

        return Array.from(keySet).filter(Boolean);
    };

    const registerElementRecord = (record) => {
        const keys = buildLookupKeys({
            code: record.code,
            name: record.name,
            buttonClassKey: '',
            buttonLabel: '',
        });
        keys.forEach((key) => {
            elementDataMap.set(key, record);
        });
    };

    const loadElementData = async () => {
        if (elementDataPromise) return elementDataPromise;

        elementDataPromise = fetch(ELEMENT_API_URL, { method: 'GET' })
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load element data (${response.status})`);
                return response.json();
            })
            .then((payload) => {
                const records = Array.isArray(payload?.elements) ? payload.elements : [];
                records.forEach(registerElementRecord);
                return records;
            })
            .catch((error) => {
                console.warn('Element data API unavailable, fallback to static text only.', error);
                return [];
            });

        return elementDataPromise;
    };

    const getElementRecordForButton = async (elementButton) => {
        await loadElementData();

        const rawName = elementButton.dataset.elementName || '';
        const buttonLabel = elementButton.textContent?.trim() || '';
        const elementClass = Array.from(elementButton.classList).find(
            (className) => className.startsWith('element-') && className !== 'element'
        );
        const buttonClassKey = elementClass ? elementClass.replace('element-', '') : '';
        const codeFromDataset = elementButton.dataset.elementCode || '';

        const keys = buildLookupKeys({
            code: codeFromDataset,
            name: rawName,
            buttonClassKey,
            buttonLabel,
        });

        for (const key of keys) {
            const record = elementDataMap.get(key);
            if (record) return record;
        }

        return null;
    };

    const activateSourceVisual = (sourceKey) => {
        allBadges.forEach((badge) => {
            badge.classList.toggle('is-active', badge.dataset.source === sourceKey);
            badge.classList.toggle('is-expanded', badge.dataset.source === sourceKey);
        });

        panels.forEach((panel) => {
            panel.classList.toggle('is-active', panel.dataset.sourcePanel === sourceKey);
        });
    };

    const pauseOrbit = () => {
        orbitTrack.classList.add('is-paused');
    };

    const resumeOrbit = () => {
        orbitTrack.classList.remove('is-paused');
    };

    const clearSourceVisual = () => {
        allBadges.forEach((badge) => {
            badge.classList.remove('is-active', 'is-expanded');
        });
        panels.forEach((panel) => panel.classList.remove('is-active'));
    };

    const hideElementPopup = () => {
        if (!elementPopup) return;
        elementPopup.classList.remove('is-open');
        elementPopup.setAttribute('aria-hidden', 'true');
        elementButtons.forEach((button) => button.classList.remove('is-selected'));
        state.activeElement = null;
    };

    const openSource = (sourceKey) => {
        if (!sourceKey) return;

        if (state.activeSource === sourceKey && sourceDetailPanel.classList.contains('is-open')) {
            closeSource();
            return;
        }

        state.activeSource = sourceKey;
        sourceDetailPanel.classList.add('is-open');
        if (elementsOverlay) {
            elementsOverlay.classList.add('is-open');
            elementsOverlay.setAttribute('aria-hidden', 'false');
        }
        activateSourceVisual(sourceKey);
        hideElementPopup();
        pauseOrbit();
    };

    const closeSource = () => {
        sourceDetailPanel.classList.remove('is-open');
        if (elementsOverlay) {
            elementsOverlay.classList.remove('is-open');
            elementsOverlay.setAttribute('aria-hidden', 'true');
        }
        clearSourceVisual();
        hideElementPopup();
        state.activeSource = null;
        resumeOrbit();
    };

    const buildPeriodLabel = (historyItem) => {
        const start = (historyItem?.start_label || '').trim();
        const end = (historyItem?.end_label || '').trim();
        const isCurrent = Boolean(historyItem?.is_current);

        if (start && end) return `${start} - ${end}`;
        if (start && isCurrent) return `${start} - 至今`;
        if (start) return start;
        if (end) return end;
        if (isCurrent) return '現任';
        return '';
    };

    const renderElementHistory = (historyItems) => {
        if (!elementPopupHistory) return;
        elementPopupHistory.innerHTML = '';

        const validHistory = Array.isArray(historyItems) ? historyItems : [];
        if (validHistory.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'is-empty';
            emptyItem.textContent = '無資料';
            elementPopupHistory.appendChild(emptyItem);
            return;
        }

        validHistory.forEach((historyItem) => {
            const holderName = (historyItem?.holder || '').trim() || '無資料';
            const periodLabel = buildPeriodLabel(historyItem);
            const note = (historyItem?.note || '').trim();

            const item = document.createElement('li');
            item.className = 'history-item';

            const topRow = document.createElement('div');
            topRow.className = 'history-item-top';

            const holder = document.createElement('span');
            holder.className = 'history-holder';
            holder.textContent = holderName;
            topRow.appendChild(holder);

            if (historyItem?.is_current) {
                const currentBadge = document.createElement('span');
                currentBadge.className = 'history-current';
                currentBadge.textContent = '現任';
                topRow.appendChild(currentBadge);
            }

            item.appendChild(topRow);

            if (periodLabel) {
                const period = document.createElement('p');
                // period.className = 'history-period';
                period.textContent = periodLabel;
                item.appendChild(period);
            }

            if (note) {
                const noteNode = document.createElement('p');
                noteNode.className = 'history-note';
                noteNode.textContent = note;
                item.appendChild(noteNode);
            }

            elementPopupHistory.appendChild(item);
        });
    };

    const openElementPopup = async (elementButton) => {
        if (!state.activeSource || !elementPopup || !elementButton) return;

        const fallbackTitle = elementButton.dataset.elementName || elementButton.textContent?.trim() || '元素';
        const fallbackDescription = elementButton.dataset.elementDescription || '無資料';

        if (elementPopupTitle) elementPopupTitle.textContent = fallbackTitle;
        if (elementPopupDescription) elementPopupDescription.textContent = fallbackDescription;
        renderElementHistory([]);

        elementButtons.forEach((button) => {
            button.classList.toggle('is-selected', button === elementButton);
        });
        state.activeElement = elementButton;

        elementPopup.classList.add('is-open');
        elementPopup.setAttribute('aria-hidden', 'false');

        const dbRecord = await getElementRecordForButton(elementButton);
        if (!dbRecord || state.activeElement !== elementButton) return;

        if (elementPopupTitle) {
            elementPopupTitle.textContent = dbRecord.name || fallbackTitle;
        }
        if (elementPopupDescription) {
            elementPopupDescription.textContent = dbRecord.description || fallbackDescription || '無資料';
        }
        renderElementHistory(dbRecord.history);
    };

    void loadElementData();

    allBadges.forEach((badge) => {
        const sourceKey = badge.dataset.source;
        if (!sourceKey) return;

        badge.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
            pauseOrbit();
        });

        badge.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openSource(sourceKey);
        });
    });

    keyboardBadges.forEach((badge) => {
        const sourceKey = badge.dataset.source;
        if (!sourceKey) return;

        badge.addEventListener('focus', () => {
            pauseOrbit();
        });

        badge.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openSource(sourceKey);
        });
    });

    elementButtons.forEach((elementButton) => {
        elementButton.addEventListener('click', (event) => {
            event.stopPropagation();
            void openElementPopup(elementButton);
        });
    });

    if (elementPopupClose) {
        elementPopupClose.addEventListener('click', (event) => {
            event.stopPropagation();
            hideElementPopup();
        });
    }

    if (sourceDetailClose) {
        sourceDetailClose.addEventListener('click', (event) => {
            event.stopPropagation();
            closeSource();
        });
    }

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const clickedInsideOrbit = target.closest('.source-orbit-stage');
        const clickedInsidePanel = target.closest('.source-detail-panel');
        const clickedInsidePopup = target.closest('#element-popup');

        if (!clickedInsidePopup) {
            hideElementPopup();
        }

        if (!clickedInsideOrbit && !clickedInsidePanel && !clickedInsidePopup) {
            closeSource();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (elementPopup?.classList.contains('is-open')) {
            hideElementPopup();
            return;
        }

        if (sourceDetailPanel.classList.contains('is-open')) {
            closeSource();
        }
    });
});
