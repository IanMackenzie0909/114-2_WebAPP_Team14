/**
 * elements.js
 * JavaScript for the Elements page (src/elements.html).
 */

document.addEventListener('DOMContentLoaded', () => {
    const orbitTrack = document.querySelector('[data-orbit-track]');
    const panels = Array.from(document.querySelectorAll('.source-panel[data-source-panel]'));
    const sourceLane = orbitTrack ? orbitTrack.querySelector('[data-source-lane]') : null;
    const sourceDetailPanel = document.querySelector('.source-detail-panel');
    const sourceDetailClose = document.getElementById('source-detail-close');
    const elementsOverlay = document.getElementById('elements-overlay');
    const elementPopup = document.getElementById('element-popup');
    const elementPopupTitle = document.getElementById('element-popup-title');
    const elementPopupDescription = document.getElementById('element-popup-description');
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

    const openElementPopup = (elementButton) => {
        if (!state.activeSource || !elementPopup || !elementButton) return;

        const title = elementButton.dataset.elementName || elementButton.textContent?.trim() || '元素';
        const description = elementButton.dataset.elementDescription || '暫無詳細描述。';

        if (elementPopupTitle) elementPopupTitle.textContent = title;
        if (elementPopupDescription) elementPopupDescription.textContent = description;

        elementButtons.forEach((button) => {
            button.classList.toggle('is-selected', button === elementButton);
        });
        state.activeElement = elementButton;

        elementPopup.classList.add('is-open');
        elementPopup.setAttribute('aria-hidden', 'false');
    };

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
            openElementPopup(elementButton);
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
