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
    submitButton.disabled = true;
    try {
      const response = await window.SkillBridgeApi.post('/api/auth/login', {
        email,
        password: passwordInput.value,
      }, { auth: false });
      const { user, token } = response?.data || {};
      if (!user || !token) throw new Error('The API response did not include a user and access token.');
      window.SkillBridgeApi.setSession(user, token, signinForm.elements['remember'].checked);
      window.location.href = 'dashboard.html';
    } catch (error) {
      if (error.status === 403 || /verif/i.test(error.message)) {
        window.SkillBridgeApi.showStatus(signinForm, error.message, true);
        showSigninVerification(email, passwordInput.value, signinForm.elements['remember'].checked);
      } else {
        window.SkillBridgeApi.showStatus(signinForm, error.message, true);
      }
    } finally {
      submitButton.disabled = false;
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
    window.SkillBridgeApi.post('/api/auth/forgot-password', { email: email.value.trim() }, { auth: false })
      .then((response) => {
        status.textContent = response?.message || 'If an account exists for this address, a reset code will be sent.';
        showResetForm(email.value.trim(), status);
      })
      .catch((error) => {
        status.textContent = error.message;
      });
  }
});

function showResetForm(emailValue, anchor) {
  document.getElementById('reset-form')?.remove();
  const form = document.createElement('form');
  form.id = 'reset-form';
  form.className = 'mt-3 space-y-2';
  form.innerHTML = `
    <input name="code" inputmode="numeric" maxlength="6" pattern="\\d{6}" required placeholder="6-digit reset code" aria-label="Reset code" class="w-full rounded-lg border border-[#CFC7DB] px-3 py-2 text-sm">
    <input name="newPassword" type="password" minlength="8" required placeholder="New password (8+ characters)" aria-label="New password" class="w-full rounded-lg border border-[#CFC7DB] px-3 py-2 text-sm">
    <button type="submit" class="rounded-lg bg-[#731F94] px-4 py-2 text-sm font-semibold text-white">Reset password</button>
    <p data-reset-status class="text-xs" role="status"></p>`;
  anchor.insertAdjacentElement('afterend', form);
  const note = form.querySelector('[data-reset-status]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = form.elements.code.value.trim();
    const newPassword = form.elements.newPassword.value;
    const button = form.querySelector('button');
    button.disabled = true;
    note.classList.remove('text-red-700');
    try {
      await window.SkillBridgeApi.post('/api/auth/verify-reset-code', { email: emailValue, code }, { auth: false });
      const done = await window.SkillBridgeApi.post('/api/auth/reset-password', { email: emailValue, code, newPassword }, { auth: false });
      note.textContent = done?.message || 'Password reset. You can now sign in.';
      form.querySelectorAll('input').forEach((el) => { el.value = ''; });
      passwordInput_focus();
    } catch (error) {
      note.classList.add('text-red-700');
      note.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

function passwordInput_focus() {
  document.getElementById('password')?.focus();
}

// Email verification section, shown when sign-in is rejected because the account is unverified.
function showSigninVerification(email, password, remember) {
  document.getElementById('verification-section')?.remove();
  const form = document.getElementById('signin-form');
  const section = document.createElement('section');
  section.id = 'verification-section';
  section.setAttribute('aria-labelledby', 'verification-title');
  section.className = 'mt-6 rounded-xl border border-[#E3DFFF] bg-[#F8F6FF] p-4';
  section.innerHTML = `
    <h2 id="verification-title" class="text-base font-bold text-[#1C1B1F]">Verify your email to sign in</h2>
    <p class="mt-1 text-xs text-[#625B6D]">Enter the 6-digit code sent to <strong></strong>.</p>
    <form id="verification-form" novalidate class="mt-3 space-y-2">
      <label for="verification-code" class="sr-only">Verification code</label>
      <input id="verification-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" class="w-full rounded-lg border border-[#CFC7DB] px-3 py-2 text-sm tracking-widest">
      <button type="submit" class="w-full rounded-lg bg-[#731F94] px-4 py-2 text-sm font-semibold text-white">Verify and sign in</button>
      <p data-verify-status class="text-xs" role="status"></p>
    </form>`;
  section.querySelector('strong').textContent = email;
  form.insertAdjacentElement('afterend', section);
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
      const response = await window.SkillBridgeApi.post('/api/auth/login', { email, password }, { auth: false });
      const { user, token } = response?.data || {};
      if (!user || !token) throw new Error('The API response did not include a user and access token.');
      window.SkillBridgeApi.setSession(user, token, remember);
      window.location.href = 'dashboard.html';
    } catch (error) {
      note.classList.add('text-red-700');
      note.textContent = error.message;
      button.disabled = false;
    }
  });
}
