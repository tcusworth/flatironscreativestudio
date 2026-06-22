/* Flatirons Creative Studio — main.js */

// Nav: transparent on homepage, solid on scroll
(function() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  function update() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// Mobile burger
(function() {
  const burger   = document.getElementById('navBurger');
  const sheet    = document.getElementById('mobileSheet');
  const backdrop = document.getElementById('mobileBackdrop');
  const close    = document.getElementById('mobileClose');
  if (!burger || !sheet) return;

  function open() {
    burger.classList.add('open');
    sheet.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    burger.classList.remove('open');
    sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => burger.classList.contains('open') ? closeMenu() : open());
  if (backdrop) backdrop.addEventListener('click', closeMenu);
  if (close) close.addEventListener('click', closeMenu);
  sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

// Fade up on scroll
(function() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();

// Service chips
(function() {
  document.querySelectorAll('.chip[data-v]').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('on');
      const input = document.getElementById('services-input');
      if (input) input.value = [...document.querySelectorAll('.chip.on')].map(c => c.dataset.v).join(', ');
    });
  });
})();

// Contact form
(function() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const submit = document.getElementById('contactSubmit');
  const label  = submit?.querySelector('.btn-label');
  const sent   = document.getElementById('sent');
  const err    = document.getElementById('sendError');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sent) sent.hidden = true;
    if (err)  err.hidden  = true;
    if (submit) submit.disabled = true;
    if (label)  label.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (res.ok) {
        if (sent) sent.hidden = false;
        form.reset();
        document.querySelectorAll('.chip.on').forEach(c => c.classList.remove('on'));
      } else { if (err) err.hidden = false; }
    } catch (_) { if (err) err.hidden = false; }
    finally {
      if (submit) submit.disabled = false;
      if (label)  label.textContent = 'Send enquiry';
    }
  });
})();

// Calendly
const CALENDLY_URL = 'https://calendly.com/tcusworth-fcstudio/30min';
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-calendly]');
  if (!btn) return;
  e.preventDefault();
  if (window.Calendly?.initPopupWidget) Calendly.initPopupWidget({ url: CALENDLY_URL });
  else window.open(CALENDLY_URL, '_blank', 'noopener');
});
