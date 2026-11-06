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

  [f.name, f.email, f.password].forEach((input) => {
    input.addEventListener('input', () => showError(input, ''));
  });
  f.terms.addEventListener('change', () => showError(f.terms, ''));

  const contractStatus = document.getElementById('signup-contract-status');
  const signInAndContinue = async (email, password) => {
    const login = await window.SkillBridgeApi.post('/api/auth/login', {
      email,
      password,
    }, { auth: false });
    const { user, token } = login?.data || {};
    if (!user || !token) throw new Error('The API response did not include a user and access token.');
    if (user.email?.trim().toLowerCase() !== email.toLowerCase()) {
      throw new Error('The API returned account details that do not match the email you registered. For your security, you have not been signed in. Contact the backend team.');
    }
    if (user.isVerified === false) {
      throw new Error('Your email is not verified. The documented API does not provide an account email-verification endpoint.');
    }
    window.SkillBridgeApi.setSession(user, token);
    window.location.href = 'survey.html';
  };
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const errors = [
      [f.name, name.split(/\s+/).length >= 2 ? '' : 'Enter your full legal name (first and last).'],
      [f.email, isEmail(email) ? '' : 'Enter a valid email address.'],
      [f.password, f.password.value.length >= 8 ? '' : 'Use at least 8 characters.'],
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
    submitButton.textContent = 'Creating account…';
    signupForm.setAttribute('aria-busy', 'true');
    try {
      const registration = await window.SkillBridgeApi.post('/api/auth/register', {
        fullName: name,
        email,
        password: f.password.value,
      }, { auth: false });
      const registeredUser = registration?.data;
      if (registeredUser?.email?.trim().toLowerCase() !== email.toLowerCase()) {
        throw new Error('The API returned account details that do not match the email you registered. Contact the backend team before continuing.');
      }
      if (typeof registeredUser.isVerified !== 'boolean') {
        throw new Error('The API registration response did not include the documented isVerified status.');
      }
      if (!registeredUser.isVerified) {
        contractStatus.textContent = 'Your account was created, but the API reports that your email is not verified. The supplied OpenAPI contract does not define an email-verification endpoint, so this page cannot verify the account or continue to the survey yet. Please ask the SkillBridge backend team to provide the documented verification flow.';
        contractStatus.classList.remove('hidden');
        signupForm.classList.add('hidden');
        return;
      }
      try {
        await signInAndContinue(email, f.password.value);
      } catch (error) {
        window.SkillBridgeApi.showStatus(signupForm, `Your account was created, but automatic sign-in failed: ${error.message} Please sign in to continue.`, true);
      }
    } catch (error) {
      if (error.status === 409 || /email.{0,30}(already exists|already registered)|already exists.{0,30}email/i.test(error.message)) {
        window.SkillBridgeApi.showStatus(signupForm, 'This email already has an account. Sign in to continue.', true);
      } else {
        window.SkillBridgeApi.showStatus(signupForm, error.message, true);
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
      signupForm.removeAttribute('aria-busy');
    }
  });
}
