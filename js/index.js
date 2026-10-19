// Mobile menu
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('mobile-menu');

function setMenu(open) {
  menu.classList.toggle('hidden', !open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });
}

// Highlight the nav link of the section being read
const navLinks = document.querySelectorAll('[data-nav]');
const sections = [...document.querySelectorAll('section[id]')].filter((s) =>
  document.querySelector(`[data-nav="${s.id}"]`)
);

function setActive(id) {
  navLinks.forEach((link) => {
    if (link.dataset.nav === id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

if (sections.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
}

// Email box in the call-to-action
const ctaForm = document.getElementById('cta-form');

if (ctaForm) {
  const input = ctaForm.querySelector('input[type="email"]');
  const error = document.getElementById('cta-error');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  ctaForm.addEventListener('submit', (e) => {
    const value = input.value.trim();
    if (!isEmail(value)) {
      e.preventDefault();
      error.textContent = 'Please enter a valid email address.';
      error.classList.remove('hidden');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    } else {
      input.value = value;
    }
  });

  input.addEventListener('input', () => {
    error.classList.add('hidden');
    input.removeAttribute('aria-invalid');
  });
}

// Sign up page: prefill the email sent from the call-to-action
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  const emailField = signupForm.querySelector('[name="email"]');
  const email = new URLSearchParams(location.search).get('email');
  if (emailField && email) emailField.value = email;

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(signupForm));
    localStorage.setItem('skillbridge_user', JSON.stringify({ name: data.name, email: data.email }));
    window.location.href = 'cv-upload.html';
  });
}

// CV upload page: show the chosen file name
const cvInput = document.getElementById('cv-file');
const cvStatus = document.getElementById('cv-status');

if (cvInput && cvStatus) {
  cvInput.addEventListener('change', () => {
    const file = cvInput.files[0];
    cvStatus.textContent = file ? `Selected: ${file.name}` : '';
  });
}