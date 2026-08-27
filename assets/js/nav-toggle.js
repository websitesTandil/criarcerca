// Menú mobile: delega el click en document para funcionar tanto con el
// header estático (index/unirse/faq) como con el que inyecta partials.js.
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.nav-toggle');
  const header = document.querySelector('header');
  if (!header) return;

  if (toggle) {
    const isOpen = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    return;
  }

  if (header.classList.contains('nav-open') && !e.target.closest('nav')) {
    header.classList.remove('nav-open');
    header.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('nav a')) return;
  const header = document.querySelector('header');
  header?.classList.remove('nav-open');
  header?.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
});
