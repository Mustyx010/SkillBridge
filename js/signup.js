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

// Sign up page
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  const f = signupForm.elements;
  const toggle = document.getElementById('toggle-password');
  const passwordEye = document.getElementById('password-eye');
  const bars = document.querySelectorAll('#strength span');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Email sent from the call-to-action on the home page
  const prefill = new URLSearchParams(location.search).get('email');
  if (prefill) f.email.value = prefill;

  function showError(input, message) {
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    error.classList.toggle('hidden', !message);
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // One point each: 8+ characters, uppercase, number, symbol
  function strength(value) {
    return [value.length >= 8, /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  }

  const colors = ['#E3DFFF', '#BA1A1A', '#E8A317', '#7B38EC', '#630ED4'];
  f.password.addEventListener('input', () => {
    const score = strength(f.password.value);
    bars.forEach((bar, i) => {
      bar.style.backgroundColor = i < score ? colors[score] : colors[0];
    });
  });

  toggle.addEventListener('click', () => {
    const show = f.password.type === 'password';
    f.password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    passwordEye.classList.toggle('ph-eye', !show);
    passwordEye.classList.toggle('ph-eye-slash', show);
  });

  document.getElementById('portal-connect').addEventListener('click', () => {
    let status = document.getElementById('portal-connect-status');
    if (!status) {
      status = document.createElement('p');
      status.id = 'portal-connect-status';
      status.className = 'mt-2 text-xs text-[#625B6D]';
      status.setAttribute('role', 'status');
      document.getElementById('portal-connect').insertAdjacentElement('afterend', status);
    }
    status.textContent = 'Enter your .edu.ng address below to continue with institutional verification.';
    f.email.focus();
  });

  document.querySelectorAll('button').forEach((button) => {
    const provider = button.textContent.match(/Continue with (Google|LinkedIn)/)?.[1];
    if (!provider) return;
    button.addEventListener('click', () => {
      let status = document.getElementById('signup-provider-status');
      if (!status) {
        status = document.createElement('p');
        status.id = 'signup-provider-status';
        status.className = 'mt-2 text-center text-xs text-[#625B6D]';
        status.setAttribute('role', 'status');
        button.parentElement.insertAdjacentElement('afterend', status);
      }
      status.textContent = `${provider} registration is not connected yet. Create your account with the form below.`;
      f.email.focus();
    });
  });

  // Keep only digits in the phone field and drop a leading 0
  f.phone.addEventListener('input', () => {
    f.phone.value = f.phone.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10);
  });

  [f.name, f.email, f.phone, f.password].forEach((input) => {
    input.addEventListener('input', () => showError(input, ''));
  });
  f.terms.addEventListener('change', () => showError(f.terms, ''));

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const phone = f.phone.value.trim();
    const errors = [
      [f.name, name.split(/\s+/).length >= 2 ? '' : 'Enter your full legal name (first and last).'],
      [f.email, isEmail(email) ? '' : 'Enter a valid email address.'],
      [f.phone, /^[789]\d{9}$/.test(phone) ? '' : 'Enter a valid 10-digit Nigerian number, e.g. 803 123 4567.'],
      [f.password, strength(f.password.value) === 4 ? '' : 'Use 8+ characters with an uppercase letter, a number and a symbol.'],
      [f.terms, f.terms.checked ? '' : 'Please accept the terms to continue.'],
    ];
    errors.forEach(([input, message]) => showError(input, message));
    const firstBad = errors.find(([, message]) => message);
    if (firstBad) {
      firstBad[0].focus();
      return;
    }

    localStorage.setItem('skillbridge_user', JSON.stringify({ name, email, phone: `+234${phone}` }));
    window.location.href = 'survey.html';
  });
}
