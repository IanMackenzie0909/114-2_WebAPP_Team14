/**
 * characters.js
 * JavaScript for the Characters page (src/characters.html).
 */

document.addEventListener('DOMContentLoaded', () => {
    const carousels = document.querySelectorAll('[data-carousel]');

    carousels.forEach((carousel) => {
        const slider = carousel.querySelector('[data-slider]');
        const slides = Array.from(carousel.querySelectorAll('.char-slide'));
        const prevBtn = carousel.querySelector('.carousel-btn.prev');
        const nextBtn = carousel.querySelector('.carousel-btn.next');
        const dotsWrap = carousel.querySelector('[data-dots]');

        if (!slider || slides.length === 0) return;

        let index = 0;
        let startX = null;

        // Keep at most 3 slides for this feature.
        if (slides.length > 3) {
            slides.slice(3).forEach((slide) => slide.remove());
        }

        const visibleSlides = Array.from(carousel.querySelectorAll('.char-slide'));

        const render = () => {
            slider.style.transform = `translateX(-${index * 100}%)`;

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

        // Build dots.
        if (dotsWrap) {
            dotsWrap.innerHTML = '';
            visibleSlides.forEach((_, dotIndex) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'carousel-dot';
                dot.setAttribute('aria-label', `切換到第 ${dotIndex + 1} 張`);
                dot.addEventListener('click', () => goTo(dotIndex));
                dotsWrap.appendChild(dot);
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));

        // Touch / drag swipe.
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

        // Hide controls if only one image.
        if (visibleSlides.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsWrap) dotsWrap.style.display = 'none';
        }

        render();
    });
});
