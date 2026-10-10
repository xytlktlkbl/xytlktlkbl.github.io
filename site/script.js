const navLinks = [...document.querySelectorAll('nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }
  }, { rootMargin: '-8% 0px -60% 0px', threshold: 0 });
  sections.forEach(section => section && observer.observe(section));
}
document.getElementById('year').textContent = new Date().getFullYear();

const writingFilters = [...document.querySelectorAll('[data-writing-filter]')];
const writingEntries = [...document.querySelectorAll('.writing-entry')];
writingFilters.forEach(button => {
  button.addEventListener('click', () => {
    const type = button.dataset.writingFilter;
    writingFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let count = 0;
    writingEntries.forEach(entry => {
      entry.hidden = type !== 'all' && entry.dataset.type !== type;
      if (!entry.hidden) count++;
    });
    document.getElementById('writing-count').textContent = `${count} ${count === 1 ? 'article' : 'articles'}`;
    document.getElementById('writing-empty').hidden = count > 0;
  });
});
