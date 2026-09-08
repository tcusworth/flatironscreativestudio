/* Flatirons Creative Studio — main.js */

// ── Nav scroll ──
(function() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  function update() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── Mobile burger ──
(function() {
  const burger   = document.getElementById('navBurger');
  const sheet    = document.getElementById('mobileSheet');
  const backdrop = document.getElementById('mobileBackdrop');
  const close    = document.getElementById('mobileClose');
  if (!burger || !sheet) return;
  function open() { burger.classList.add('open'); sheet.classList.add('open'); if(backdrop) backdrop.classList.add('open'); burger.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; }
  function closeMenu() { burger.classList.remove('open'); sheet.classList.remove('open'); if(backdrop) backdrop.classList.remove('open'); burger.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
  burger.addEventListener('click', () => burger.classList.contains('open') ? closeMenu() : open());
  if(backdrop) backdrop.addEventListener('click', closeMenu);
  if(close) close.addEventListener('click', closeMenu);
  sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeMenu(); });
})();

// ── Fade up on scroll ──
(function() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();

// ── Count-up numbers ──
(function() {
  const els = document.querySelectorAll('.count-up');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el     = en.target;
      const target = parseInt(el.dataset.target, 10);
      const dur    = 1800;
      const start  = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(ease * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
})();

// ── Service chips (handles multiple chip groups by closest container) ──
(function() {
  const groups = [
    { containerId: 'chips',     inputId: 'services-input' },
    { containerId: 'goalChips', inputId: 'goals-input' }
  ];
  groups.forEach(({ containerId, inputId }) => {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container) return;
    container.querySelectorAll('.chip[data-v]').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('on');
        if (input) {
          input.value = [...container.querySelectorAll('.chip.on')].map(c => c.dataset.v).join(', ');
        }
      });
    });
  });
  // Fallback for contact page's single un-grouped #chips with no container wrap issues
  document.querySelectorAll('.chip[data-v]').forEach(chip => {
    if (chip.closest('#chips') || chip.closest('#goalChips')) return;
    chip.addEventListener('click', () => {
      chip.classList.toggle('on');
      const input = document.getElementById('services-input');
      if (input) input.value = [...document.querySelectorAll('.chip.on')].map(c => c.dataset.v).join(', ');
    });
  });
})();

// ── Generic Formspree submit handler (works for contact + intake forms) ──
(function() {
  const forms = [
    { formId: 'contactForm', submitId: 'contactSubmit', sentId: 'sent',       errId: 'sendError',   resetLabel: 'Send enquiry' },
    { formId: 'intakeForm',  submitId: 'intakeSubmit',  sentId: 'intakeSent', errId: 'intakeError',  resetLabel: 'Send project details' }
  ];
  forms.forEach(({ formId, submitId, sentId, errId, resetLabel }) => {
    const form = document.getElementById(formId);
    if (!form) return;
    const submit = document.getElementById(submitId);
    const label  = submit?.querySelector('.btn-label');
    const sent   = document.getElementById(sentId);
    const err    = document.getElementById(errId);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sent) sent.hidden = true;
      if (err)  err.hidden  = true;
      if (submit) submit.disabled = true;
      if (label)  label.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (res.ok) { if (sent) sent.hidden = false; form.reset(); form.querySelectorAll('.chip.on').forEach(c => c.classList.remove('on')); }
        else { if (err) err.hidden = false; }
      } catch (_) { if (err) err.hidden = false; }
      finally { if (submit) submit.disabled = false; if (label) label.textContent = resetLabel; }
    });
  });
})();

// ── Calendly ──
const CALENDLY_URL = 'https://calendly.com/tcusworth-fcstudio/30min';
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-calendly]');
  if (!btn) return;
  e.preventDefault();
  if (window.Calendly?.initPopupWidget) Calendly.initPopupWidget({ url: CALENDLY_URL });
  else window.open(CALENDLY_URL, '_blank', 'noopener');
});

// ── Hero cinematic settle ──
(function() {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = null;
  function update() {
    raf = null;
    const h = hero.offsetHeight || window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / h));
    hero.style.setProperty('--hp', p.toFixed(4));
  }
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ── Stagger indices for revealed groups and the mobile sheet ──
(function() {
  const groups = [
    '.work-full-grid', '.dest-grid', '.svc-grid', '.card-grid',
    '.about-grid', '.post-grid', '.mobile-sheet'
  ];
  groups.forEach(sel => {
    document.querySelectorAll(sel).forEach(g => {
      Array.from(g.children).forEach((el, i) => el.style.setProperty('--i', i));
    });
  });
})();

// ── Magnetic primary buttons ──
(function() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('.hero-cta, .nav-cta, .filter-explore-btn').forEach(btn => {
    btn.setAttribute('data-magnet', '');
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      btn.style.setProperty('--mx', (dx * 8).toFixed(2) + 'px');
      btn.style.setProperty('--my', (dy * 6).toFixed(2) + 'px');
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });
})();

// ── Page transition fallback (browsers without View Transitions) ──
(function() {
  if (document.startViewTransition) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.body.classList.add('page-enter');
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 200);
  });
  window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
})();
