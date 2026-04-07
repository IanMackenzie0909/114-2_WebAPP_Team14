/**
 * characters.js
 * JavaScript for the Characters page (src/characters.html).
 */

document.addEventListener('DOMContentLoaded', () => {
    const carousels = document.querySelectorAll('[data-carousel]');
    const modal = document.getElementById('character-modal');
    const modalCloseBtn = document.getElementById('character-modal-close');
    const modalImageWrap = document.querySelector('.modal-image-wrap');

    const modalName = document.getElementById('modal-name');
    const modalImage = document.getElementById('modal-image');
    const modalGender = document.getElementById('modal-gender');
    const modalAffiliation = document.getElementById('modal-affiliation');
    const modalHomeland = document.getElementById('modal-homeland');
    const modalOccupation = document.getElementById('modal-occupation');
    const modalElement = document.getElementById('modal-element');
    const modalFirstAppearance = document.getElementById('modal-first-appearance');
    const modalDescription = document.getElementById('modal-description');
    const modalVoteCount = document.getElementById('modal-vote-count');
    const modalVoteBtn = document.getElementById('modal-vote-btn');
    const modalVoteFeedback = document.getElementById('modal-vote-feedback');
    let activeCard = null;

    const setText = (node, value) => {
        if (!node) return;
        const text = (value || '').trim();
        node.textContent = text.length > 0 ? text : '-';
    };

    const setVoteCountText = (node, value) => {
        if (!node) return;
        const parsed = Number.parseInt(String(value), 10);
        node.textContent = Number.isNaN(parsed) ? '0' : String(parsed);
    };

    const getCsrfToken = () => {
        const cookieValue = document.cookie
            .split(';')
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('csrftoken='));
        return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
    };

    const setVoteFeedback = (message, isError = false) => {
        if (!modalVoteFeedback) return;
        modalVoteFeedback.textContent = message || '';
        modalVoteFeedback.classList.toggle('is-error', Boolean(isError));
    };

    const setVoteButtonState = (hasVoted) => {
        if (!modalVoteBtn) return;
        modalVoteBtn.disabled = hasVoted;
        modalVoteBtn.textContent = hasVoted ? '已投票' : '投一票';
    };

    const setModalImage = (card) => {
        if (!modalImage || !card) return;

        const slides = Array.from(card.querySelectorAll('.char-slide'));
        if (slides.length === 0) {
            modalImage.removeAttribute('src');
            modalImage.alt = '';
            if (modalImageWrap) {
                modalImageWrap.style.removeProperty('--modal-bg-image');
            }
            return;
        }

        let currentIndex = Number.parseInt(card.dataset.currentIndex || '0', 10);
        if (Number.isNaN(currentIndex)) currentIndex = 0;
        currentIndex = Math.max(0, Math.min(currentIndex, slides.length - 1));

        const activeSlide = slides[currentIndex] || slides[0];
        const activeSrc = activeSlide.currentSrc || activeSlide.src;
        modalImage.src = activeSrc;
        modalImage.alt = activeSlide.alt || `${card.dataset.name || 'Character'} image`;
        modalImage.style.objectPosition = getComputedStyle(activeSlide).objectPosition || 'center top';

        if (modalImageWrap) {
            const safeSrc = String(activeSrc).replace(/"/g, '\\"');
            modalImageWrap.style.setProperty('--modal-bg-image', `url("${safeSrc}")`);
        }
    };

    const openModal = (card) => {
        if (!modal || !card) return;
        activeCard = card;
        modal.dataset.characterId = card.dataset.characterId || '';

        setText(modalName, card.dataset.name);
        setModalImage(card);
        setText(modalGender, card.dataset.gender);
        setText(modalAffiliation, card.dataset.affiliation);
        setText(modalHomeland, card.dataset.homeland);
        setText(modalOccupation, card.dataset.occupation);
        setText(modalElement, card.dataset.element);
        setText(modalFirstAppearance, card.dataset.firstAppearance);
        setText(modalDescription, card.dataset.description);
        setVoteCountText(modalVoteCount, card.dataset.voteCount || '0');
        const hasVoted = card.dataset.hasVoted === 'true';
        setVoteButtonState(hasVoted);
        setVoteFeedback(hasVoted ? '你已對此角色投過票。' : '');

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        modal.dataset.characterId = '';
        activeCard = null;
        setVoteButtonState(false);
        setVoteFeedback('');
    };

    carousels.forEach((carousel) => {
        const slider = carousel.querySelector('[data-slider]');
        const slides = Array.from(carousel.querySelectorAll('.char-slide'));
        const prevBtn = carousel.querySelector('.carousel-btn.prev');
        const nextBtn = carousel.querySelector('.carousel-btn.next');
        const dotsWrap = carousel.querySelector('[data-dots]');

        if (!slider || slides.length === 0) return;

        let index = 0;
        let startX = null;

        if (slides.length > 3) {
            slides.slice(3).forEach((slide) => slide.remove());
        }

        const visibleSlides = Array.from(carousel.querySelectorAll('.char-slide'));

        const render = () => {
            slider.style.transform = `translateX(-${index * 100}%)`;
            carousel.dataset.currentIndex = String(index);

            visibleSlides.forEach((slide, slideIndex) => {
                slide.classList.toggle('is-active', slideIndex === index);
            });

            if (dotsWrap) {
                dotsWrap.querySelectorAll('.carousel-dot').forEach((dot, dotIndex) => {
                    dot.classList.toggle('active', dotIndex === index);
                });
            }
        };

        const goTo = (nextIndex) => {
            const count = visibleSlides.length;
            if (count <= 1) return;
            index = (nextIndex + count) % count;
            render();
        };

        if (dotsWrap) {
            dotsWrap.innerHTML = '';
            visibleSlides.forEach((_, dotIndex) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'carousel-dot';
                dot.setAttribute('aria-label', `Slide ${dotIndex + 1}`);
                dot.addEventListener('click', (event) => {
                    event.stopPropagation();
                    goTo(dotIndex);
                });
                dotsWrap.appendChild(dot);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                goTo(index - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                goTo(index + 1);
            });
        }

        slider.addEventListener('pointerdown', (event) => {
            startX = event.clientX;
        });

        slider.addEventListener('pointerup', (event) => {
            if (startX === null) return;
            const deltaX = event.clientX - startX;

            if (Math.abs(deltaX) > 35) {
                if (deltaX < 0) {
                    goTo(index + 1);
                } else {
                    goTo(index - 1);
                }
            }

            startX = null;
        });

        slider.addEventListener('pointerleave', () => {
            startX = null;
        });

        if (visibleSlides.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsWrap) dotsWrap.style.display = 'none';
        }

        carousel.addEventListener('click', (event) => {
            if (event.target.closest('.carousel-btn') || event.target.closest('.carousel-dot')) return;
            openModal(carousel);
        });

        carousel.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openModal(carousel);
            }
        });

        render();
    });

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

    if (modalVoteBtn) {
        modalVoteBtn.addEventListener('click', async () => {
            const characterId = modal?.dataset.characterId || '';
            if (!characterId) {
                setVoteFeedback('找不到角色編號，無法投票。', true);
                return;
            }

            modalVoteBtn.disabled = true;
            setVoteFeedback('投票中...');

            try {
                const response = await fetch(`/characters/${characterId}/vote/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const nextCount = data?.vote_count;
                setVoteCountText(modalVoteCount, nextCount);

                const alreadyVoted = Boolean(data?.already_voted);
                const nextVotedState = true;

                if (activeCard) {
                    activeCard.dataset.voteCount = String(nextCount);
                    activeCard.dataset.hasVoted = 'true';
                    const cardVoteNode = activeCard.querySelector('.vote-count');
                    setVoteCountText(cardVoteNode, nextCount);
                }

                setVoteButtonState(nextVotedState);
                setVoteFeedback(alreadyVoted ? '你已對此角色投過票。' : '投票成功！');
            } catch (error) {
                setVoteFeedback('投票失敗，請稍後再試。', true);
                setVoteButtonState(false);
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });
});
