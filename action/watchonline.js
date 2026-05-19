const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(c => {
        if (f === 'all') {
          c.style.display = '';
        } else if (f === 'zh') {
          c.style.display = (c.dataset.lang === 'zh' || c.dataset.lang === 'both') ? '' : 'none';
        } else if (f === 'en') {
          c.style.display = (c.dataset.lang === 'en' || c.dataset.lang === 'both') ? '' : 'none';
        }
      });
    });
  });

  // Mark cards that have both
  document.querySelectorAll('.card').forEach(c => {
    const hasZh = c.querySelector('.badge-zh');
    const hasEn = c.querySelector('.badge-en');
    if (hasZh && hasEn) c.dataset.lang = 'both';
  });
