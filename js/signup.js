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
      if (registeredUser?.isVerified === false) {
        showVerification(email, f.password.value);
        return;
      }
      try {
        await loginAndContinue(email, f.password.value);
      } catch (error) {
        window.SkillBridgeApi.showStatus(signupForm, `Your account was created, but automatic sign-in failed: ${error.message} Please sign in to continue.`, true);
      }
    } catch (error) {
      window.SkillBridgeApi.showStatus(signupForm, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function loginAndContinue(email, password) {
  const login = await window.SkillBridgeApi.post('/api/auth/login', { email, password }, { auth: false });
  const { user, token } = login?.data || {};
  if (!user || !token) throw new Error('The API response did not include a user and access token.');
  window.SkillBridgeApi.setSession(user, token);
  window.location.href = 'survey.html';
}

// Email verification section, shown after registration when the account is unverified.
function showVerification(email, password) {
  document.getElementById('verification-section')?.remove();
  const form = document.getElementById('signup-form');
  const section = document.createElement('section');
  section.id = 'verification-section';
  section.setAttribute('aria-labelledby', 'verification-title');
  section.className = 'mt-6 rounded-xl border border-[#E3DFFF] bg-[#F8F6FF] p-4';
  section.innerHTML = `
    <h2 id="verification-title" class="text-base font-bold text-[#1C1B1F]">Verify your email</h2>
    <p class="mt-1 text-xs text-[#625B6D]">We sent a 6-digit code to <strong></strong>. Enter it below to activate your account.</p>
    <form id="verification-form" novalidate class="mt-3 space-y-2">
      <label for="verification-code" class="sr-only">Verification code</label>
      <input id="verification-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" class="w-full rounded-lg border border-[#CFC7DB] px-3 py-2 text-sm tracking-widest">
      <button type="submit" class="w-full rounded-lg bg-[#731F94] px-4 py-2 text-sm font-semibold text-white">Verify and continue</button>
      <p data-verify-status class="text-xs" role="status"></p>
    </form>
    <p class="mt-2 text-xs text-[#625B6D]">Already verified? <a href="signin.html" class="font-semibold text-[#731F94] underline">Sign in</a></p>`;
  section.querySelector('strong').textContent = email;
  form.insertAdjacentElement('afterend', section);
  form.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
  const vForm = section.querySelector('#verification-form');
  const note = section.querySelector('[data-verify-status]');
  vForm.elements.code.focus();
  vForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = vForm.elements.code.value.trim();
    note.classList.remove('text-red-700');
    if (!/^\d{6}$/.test(code)) {
      note.classList.add('text-red-700');
      note.textContent = 'Enter the 6-digit code from your email.';
      return;
    }
    const button = vForm.querySelector('button');
    button.disabled = true;
    try {
      await window.SkillBridgeApi.post('/api/auth/verify-email', { email, code }, { auth: false });
      note.textContent = 'Email verified. Signing you in…';
      await loginAndContinue(email, password);
    } catch (error) {
      note.classList.add('text-red-700');
      note.textContent = error.status === 404
        ? 'Email verification is not available on the server yet. Try signing in instead.'
        : error.message;
      button.disabled = false;
    }
  });
}
