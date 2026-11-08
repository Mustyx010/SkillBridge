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

// Sign in page
const signinForm = document.getElementById('signin-form');

if (signinForm) {
  const emailInput = signinForm.elements['email'];
  const passwordInput = signinForm.elements['password'];
  const toggle = document.getElementById('toggle-password');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const signIn = async (email, password) => {
    const response = await window.SkillBridgeApi.post('/api/v1/auth/login', {
      email,
      password,
    }, { auth: false });
    const { user, token } = response?.data || {};
    if (!user || !token) throw new Error('The API response did not include a user and access token.');
    if (user.email?.trim().toLowerCase() !== email.toLowerCase()) {
      throw new Error('The API returned account details that do not match the email you entered. For your security, you have not been signed in. Contact the backend team.');
    }
    if (user.isVerified === false) {
      throw new Error('Your email address is not verified. Verify it from the sign-up page before signing in.');
    }
    window.SkillBridgeApi.setSession(user, token, signinForm.elements['remember'].checked);
    window.location.href = 'dashboard.html';
  };

  function showError(input, message) {
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    error.classList.toggle('hidden', !message);
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  toggle.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => showError(input, ''));
  });

  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const emailOk = isEmail(email);
    const passwordOk = passwordInput.value.length > 0;

    showError(emailInput, emailOk ? '' : 'Please enter a valid email address.');
    showError(passwordInput, passwordOk ? '' : 'Please enter your password.');
    if (!emailOk) return emailInput.focus();
    if (!passwordOk) return passwordInput.focus();

    const submitButton = signinForm.querySelector('[type="submit"]');
    const stopLoading = window.SkillBridgeApi.setLoading(submitButton, 'Signing in…');
    try {
      await signIn(email, passwordInput.value);
    } catch (error) {
      window.SkillBridgeApi.showStatus(signinForm, error.message, true);
    } finally {
      stopLoading();
    }
  });
}

// OAuth and email-reset services need provider credentials and a backend. Give
// clear feedback so these controls do not appear to do nothing in this demo.
document.querySelectorAll('button').forEach((button) => {
  const provider = button.textContent.match(/Continue with (Google)/)?.[1];
  if (!provider) return;
  button.addEventListener('click', () => {
    let status = document.getElementById('signin-provider-status');
    if (!status) {
      status = document.createElement('p');
      status.id = 'signin-provider-status';
      status.className = 'mt-2 text-center text-xs text-[#625B6D]';
      status.setAttribute('role', 'status');
      button.parentElement.insertAdjacentElement('afterend', status);
    }
    status.textContent = `${provider} sign-in is not connected yet. Continue with your email below.`;
    signinForm?.elements.email.focus();
  });
});

const forgotPassword = [...document.querySelectorAll('a')].find((link) => link.textContent.trim() === 'Forgot password?');
forgotPassword?.addEventListener('click', (event) => {
  event.preventDefault();
  const email = document.getElementById('email');
  let status = document.getElementById('password-reset-status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'password-reset-status';
    status.className = 'mt-2 text-xs text-[#625B6D]';
    status.setAttribute('role', 'status');
    forgotPassword.insertAdjacentElement('afterend', status);
  }
  if (!email.value.trim()) {
    status.textContent = 'Enter your email address above to request a password reset.';
    email.focus();
  } else {
    status.textContent = 'Sending password reset request…';
    const stopLoading = window.SkillBridgeApi.setLoading(forgotPassword, 'Sending…');
    window.SkillBridgeApi.post('/api/v1/auth/forgot-password', { email: email.value.trim() }, { auth: false })
      .then((response) => {
        status.textContent = response?.message || 'If an account exists for this address, password reset instructions will be sent.';
      })
      .catch((error) => {
        status.textContent = error.message;
      })
      .finally(stopLoading);
  }
});
