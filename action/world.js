/**
 * world.js
 * Loads WorldLocation records from the Django API and renders category filters.
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/world/locations/';
    const grid = document.getElementById('world-grid');
    const status = document.getElementById('world-status');
    const filterList = document.getElementById('world-category-filter');
    const allFilterBtn = document.querySelector('.world-filter-btn[data-category="all"]');
    const modal = document.getElementById('world-modal');
    const modalCloseBtn = document.getElementById('world-modal-close');
    const modalImage = document.getElementById('world-modal-image');
    const modalCategory = document.getElementById('world-modal-category');
    const modalTitle = document.getElementById('world-modal-title');
    const modalNameEn = document.getElementById('world-modal-name-en');
    const modalDescription = document.getElementById('world-modal-description');
    const CATEGORY_LABELS = {
        realm: '世界',
        kingdom_land: '國度',
        city_settlement: '城市/聚落',
        island: '島嶼',
        landmark: '重要地標',
    };
    const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

    let locations = [];
    let activeCategory = 'all';

    function setStatus(message, isError = false) {
        if (!status) return;
        status.textContent = message;
        status.classList.toggle('is-error', isError);
        status.hidden = !message;
    }

    function setText(element, text) {
        if (!element) return;
        element.textContent = text || '';
    }

    function getDisplayName(location) {
        const nameZh = location.nameZh || '';
        const nameEn = location.nameEn || '';
        return nameEn ? `${nameZh} ${nameEn}` : nameZh;
    }

    function setActiveFilterButton(category) {
        document.querySelectorAll('.world-filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.category === category);
        });
    }

    function createFilterButtons() {
        if (!filterList) return;

        const categoryMap = new Map(Object.entries(CATEGORY_LABELS));
        locations.forEach((location) => {
            if (location.category && location.categoryLabel) {
                categoryMap.set(location.category, location.categoryLabel);
            }
        });

        filterList.innerHTML = '';
        const categoryEntries = [...categoryMap.entries()].sort(([categoryA], [categoryB]) => {
            const indexA = CATEGORY_ORDER.indexOf(categoryA);
            const indexB = CATEGORY_ORDER.indexOf(categoryB);

            if (indexA === -1 && indexB === -1) {
                return categoryA.localeCompare(categoryB);
            }

            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        categoryEntries.forEach(([category, label]) => {
            const button = document.createElement('button');
            button.className = 'world-filter-btn';
            button.type = 'button';
            button.dataset.category = category;
            button.textContent = label;
            button.addEventListener('click', () => {
                activeCategory = category;
                setActiveFilterButton(category);
                renderLocations();
            });
            filterList.appendChild(button);
        });
    }

    function createCard(location) {
        const card = document.createElement('button');
        card.className = 'world-card';
        card.type = 'button';
        card.dataset.category = location.category || '';
        card.setAttribute('aria-label', `查看${getDisplayName(location)}完整介紹`);

        if (location.image) {
            const image = document.createElement('img');
            image.className = 'world-card-image';
            image.src = location.image;
            image.alt = location.imageDescription || getDisplayName(location);
            card.appendChild(image);
        }

        const body = document.createElement('div');
        body.className = 'world-card-body';

        const category = document.createElement('span');
        category.className = 'world-card-category';
        category.textContent = location.categoryLabel || location.category || '';
        body.appendChild(category);

        const title = document.createElement('h3');
        title.textContent = getDisplayName(location);
        body.appendChild(title);

        const description = document.createElement('p');
        description.textContent = location.shortDescription || location.longDescription || '';
        body.appendChild(description);

        card.appendChild(body);
        card.addEventListener('click', () => openModal(location));

        return card;
    }

    function renderLocations() {
        if (!grid) return;

        const visibleLocations = activeCategory === 'all'
            ? locations
            : locations.filter((location) => location.category === activeCategory);

        grid.innerHTML = '';

        if (visibleLocations.length === 0) {
            setStatus('目前沒有符合此分類的世界觀資料。');
            return;
        }

        setStatus('');
        visibleLocations.forEach((location) => {
            grid.appendChild(createCard(location));
        });
    }

    function openModal(location) {
        if (!modal) return;

        if (modalImage) {
            if (location.image) {
                modalImage.hidden = false;
                modalImage.src = location.image;
                modalImage.alt = location.imageDescription || getDisplayName(location);
            } else {
                modalImage.hidden = true;
                modalImage.removeAttribute('src');
                modalImage.alt = '';
            }
        }

        setText(modalCategory, location.categoryLabel || location.category || '');
        setText(modalTitle, location.nameZh || '');
        setText(modalNameEn, location.nameEn || '');
        setText(modalDescription, location.longDescription || location.shortDescription || '');

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('world-modal-open');
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('world-modal-open');
    }

    async function loadLocations() {
        setStatus('正在載入世界觀資料...');

        try {
            const response = await fetch(API_URL, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            locations = Array.isArray(data.locations) ? data.locations : [];

            if (locations.length === 0) {
                setStatus('目前資料庫尚未建立世界觀資料，請先到 Django Admin 新增 WorldLocation。');
                return;
            }

            createFilterButtons();
            setActiveFilterButton(activeCategory);
            renderLocations();
        } catch (error) {
            console.error('[World] Failed to load locations:', error);
            setStatus('無法載入世界觀資料，請確認 Django 後端正在執行。', true);
        }
    }

    if (allFilterBtn) {
        allFilterBtn.addEventListener('click', () => {
            activeCategory = 'all';
            setActiveFilterButton(activeCategory);
            renderLocations();
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal?.classList.contains('show')) {
            closeModal();
        }
    });

    loadLocations();
});
