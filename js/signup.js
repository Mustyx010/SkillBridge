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

  const verificationSection = document.getElementById('signup-verification-section');
  const verificationForm = document.getElementById('signup-verification-form');
  const verificationEmail = verificationForm.elements['email'];
  const verificationCode = verificationForm.elements['code'];
  const verificationSuccess = document.getElementById('signup-verification-success');
  const showVerificationButton = document.getElementById('show-signup-verification');
  const showVerification = (email = '') => {
    verificationEmail.value = email;
    verificationSection.classList.remove('hidden');
    showVerificationButton.setAttribute('aria-expanded', 'true');
    (email ? verificationCode : verificationEmail).focus();
  };

  showVerificationButton.addEventListener('click', () => {
    const isOpen = showVerificationButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      verificationSection.classList.add('hidden');
      showVerificationButton.setAttribute('aria-expanded', 'false');
    } else {
      showVerification(verificationEmail.value.trim() || f.email.value.trim());
    }
  });

  verificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = verificationEmail.value.trim();
    const code = verificationCode.value.trim();
    if (!isEmail(email)) {
      verificationEmail.focus();
      return window.SkillBridgeApi.showStatus(verificationForm, 'Enter a valid email address.', true);
    }
    if (!code) {
      verificationCode.focus();
      return window.SkillBridgeApi.showStatus(verificationForm, 'Enter the verification code from your email.', true);
    }

    const submitButton = verificationForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      await window.SkillBridgeApi.post('/api/v1/auth/verify-email', { email, code }, { auth: false });
      verificationForm.parentElement.querySelector('[data-api-status]')?.remove();
      verificationForm.classList.add('hidden');
      verificationSuccess.classList.remove('hidden');
    } catch (error) {
      window.SkillBridgeApi.showStatus(verificationForm, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });

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
      const registration = await window.SkillBridgeApi.post('/api/v1/auth/register', {
        fullName: name,
        email,
        password: f.password.value,
      }, { auth: false });
      const registeredUser = registration?.data;
      if (registeredUser?.email?.trim().toLowerCase() !== email.toLowerCase()) {
        throw new Error('The API returned account details that do not match the email you registered. Contact the backend team before continuing.');
      }
      if (registeredUser?.isVerified !== true) {
        signupForm.classList.add('hidden');
        showVerification(email);
        verificationCode.focus();
        return;
      }
      try {
        const login = await window.SkillBridgeApi.post('/api/v1/auth/login', {
          email,
          password: f.password.value,
        }, { auth: false });
        const { user, token } = login?.data || {};
        if (!user || !token) throw new Error('The API response did not include a user and access token.');
        if (user.email?.trim().toLowerCase() !== email.toLowerCase()) {
          throw new Error('The API returned account details that do not match the email you registered. For your security, you have not been signed in. Contact the backend team.');
        }
        window.SkillBridgeApi.setSession(user, token);
        window.location.href = 'survey.html';
      } catch (error) {
        window.SkillBridgeApi.showStatus(signupForm, `Your account was created, but automatic sign-in failed: ${error.message} Please sign in to continue.`, true);
      }
    } catch (error) {
      if (error.status === 409 || /email.{0,30}(already exists|already registered)|already exists.{0,30}email/i.test(error.message)) {
        showVerification(email);
        window.SkillBridgeApi.showStatus(signupForm, 'This email already has an account. Enter the verification code here, or sign in if your email is already verified.');
      } else {
        window.SkillBridgeApi.showStatus(signupForm, error.message, true);
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}
