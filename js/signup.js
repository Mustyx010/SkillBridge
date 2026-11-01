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

  const colors = ['#E3DFFF', '#BA1A1A', '#E8A317', '#C238EC', '#731F94'];
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
    const provider = button.textContent.match(/Continue with (Google)/)?.[1];
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

  [f.name, f.email, f.password].forEach((input) => {
    input.addEventListener('input', () => showError(input, ''));
  });
  f.terms.addEventListener('change', () => showError(f.terms, ''));

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const errors = [
      [f.name, name.split(/\s+/).length >= 2 ? '' : 'Enter your full legal name (first and last).'],
      [f.email, isEmail(email) ? '' : 'Enter a valid email address.'],
      [f.password, strength(f.password.value) === 4 ? '' : 'Use 8+ characters with an uppercase letter, a number and a symbol.'],
      [f.terms, f.terms.checked ? '' : 'Please accept the terms to continue.'],
    ];
    errors.forEach(([input, message]) => showError(input, message));
    const firstBad = errors.find(([, message]) => message);
    if (firstBad) {
      firstBad[0].focus();
      return;
    }

    const submitButton = signupForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const registration = await window.SkillBridgeApi.post('/api/auth/register', {
        fullName: name,
        email,
        password: f.password.value,
      }, { auth: false });
      const registeredUser = registration?.data;
      localStorage.setItem('skillbridge_user', JSON.stringify({
        name: registeredUser?.fullName || name,
        email: registeredUser?.email || email,
        id: registeredUser?.id,
      }));
      try {
        const login = await window.SkillBridgeApi.post('/api/auth/login', {
          email,
          password: f.password.value,
        }, { auth: false });
        const { user, token } = login?.data || {};
        if (!user || !token) throw new Error('The API response did not include a user and access token.');
        window.SkillBridgeApi.setSession(user, token);
        window.location.href = 'survey.html';
      } catch (error) {
        window.SkillBridgeApi.showStatus(signupForm, `Your account was created, but automatic sign-in failed: ${error.message} Sign in to continue.`, true);
      }
    } catch (error) {
      window.SkillBridgeApi.showStatus(signupForm, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });
}
