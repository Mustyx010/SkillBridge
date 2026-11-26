
const form = document.getElementById('survey-form');
const STORAGE_KEY = 'skillbridge_survey';

// =====================================================
// 1. SALARY RANGE SLIDER
// =====================================================

const payMin = document.getElementById('pay-min');
const payMax = document.getElementById('pay-max');
const payFill = document.getElementById('pay-fill');
const payRange = document.getElementById('pay-range');

const GAP = 10000;

const naira = (n) =>
  '₦' + Number(n).toLocaleString('en-US');

function updateRange(changed) {
  if (!payMin || !payMax || !payFill || !payRange) return;

  let low = Number(payMin.value);
  let high = Number(payMax.value);

  if (high - low < GAP) {
    if (changed === payMin) {
      low = high - GAP;
    } else {
      high = low + GAP;
    }

    payMin.value = low;
    payMax.value = high;
  }

  const min = Number(payMin.min);
  const span = Number(payMin.max) - min;

  if (span <= 0) return;

  payFill.style.left =
    `calc(9px + (100% - 18px) * ${(low - min) / span})`;

  payFill.style.width =
    `calc((100% - 18px) * ${(high - low) / span})`;

  payRange.textContent =
    `${naira(low)} – ${naira(high)}`;
}

[payMin, payMax].forEach((input) => {
  input?.addEventListener('input', () => updateRange(input));
});

// =====================================================
// 2. INSTITUTION SUGGESTIONS
// =====================================================

const institution = document.getElementById('institution');

document.querySelectorAll('[data-institution]').forEach((chip) => {
  chip.addEventListener('click', () => {
    if (!institution) return;

    institution.value = chip.dataset.institution;

    institution.dispatchEvent(
      new Event('input', { bubbles: true })
    );

    institution.focus();
  });
});

// =====================================================
// 3. AUTO-SAVE
// =====================================================

const saveStatus = document.getElementById('save-status');

let savedAt = null;
let timer;

function readForm() {
  return Object.fromEntries(new FormData(form));
}

function timeAgo() {
  if (!savedAt) return '';

  const minutes = Math.floor(
    (Date.now() - savedAt) / 60000
  );

  if (minutes < 1) return 'just now';

  return minutes === 1
    ? '1 min ago'
    : `${minutes} min ago`;
}

function showStatus() {
  if (!savedAt || !saveStatus) return;

  saveStatus.textContent =
    `Step 1 of 4 • Auto-saved ${timeAgo()}`;
}

function save(completed = false) {
  savedAt = Date.now();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      data: readForm(),
      savedAt,
      completed,
    })
  );

  showStatus();
}

function restore() {
  let saved;

  try {
    saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return;
  }

  if (!saved || !saved.data) return;

  Object.entries(saved.data).forEach(([name, value]) => {
    const fields = form.querySelectorAll(
      `[name="${name}"]`
    );

    fields.forEach((field) => {
      if (field.type === 'radio') {
        field.checked = field.value === value;
      } else if (field.type === 'checkbox') {
        field.checked = Array.isArray(value)
          ? value.includes(field.value)
          : field.value === value;
      } else {
        field.value = value;
      }
    });
  });

  updateRange();

  savedAt = saved.savedAt || Date.now();

  showStatus();
}

form.addEventListener('input', () => {
  clearTimeout(timer);

  timer = setTimeout(() => save(), 600);
});

form.addEventListener('change', () => save());

setInterval(showStatus, 30000);

// =====================================================
// 4. CONTINUE TO CV UPLOAD
// =====================================================

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = readForm();

  // Validate the new career fields.
  if (!data.targetJobTitle?.trim()) {
    window.SkillBridgeApi.showStatus(
      form,
      'Enter your target job role before continuing.',
      true
    );

    document.getElementById('targetJobTitle')?.focus();

    return;
  }

  if (!data.industryFocus?.trim()) {
    window.SkillBridgeApi.showStatus(
      form,
      'Enter your preferred industry before continuing.',
      true
    );

    document.getElementById('industryFocus')?.focus();

    return;
  }

  if (!data.primaryGoal) {
    window.SkillBridgeApi.showStatus(
      form,
      'Select your primary career goal before continuing.',
      true
    );

    document.getElementById('primaryGoal')?.focus();

    return;
  }

  save(true);

  const education = [
    data.degree,
    data.field,
    data.institution,
  ]
    .filter(Boolean)
    .join(' - ');

  const submitButton = form.querySelector(
    '[type="submit"]'
  );

  const stopLoading =
    window.SkillBridgeApi.setLoading(
      submitButton,
      'Saving and continuing…'
    );

  try {
    await window.SkillBridgeApi.put(
      '/api/v1/profiles/me',
      {
        location: data.location || null,

        education: education || null,

        // The candidate can enter any role.
        careerGoal: data.targetJobTitle.trim(),

        // Additional career preferences.
        targetJobTitle: data.targetJobTitle.trim(),

        industryFocus: data.industryFocus.trim(),

        primaryGoal: data.primaryGoal,

        // Keep the previous survey track if it exists.
        track: data.track || null,

        // Preserve remuneration preferences.
        salaryExpectation: {
          minimum: data.payMin
            ? Number(data.payMin)
            : null,

          maximum: data.payMax
            ? Number(data.payMax)
            : null,
        },

        // Preserve work preference if supplied.
        preferredWorkMode:
          data.workMode ||
          data.preferredWorkMode ||
          null,
      }
    );

    window.location.href = 'cv-upload.html';

  } catch (error) {
    window.SkillBridgeApi.showStatus(
      form,
      `Could not save your answers to your account: ${error.message}`,
      true
    );

  } finally {
    stopLoading();
  }
});

// =====================================================
// 5. RESTORE PREVIOUS ANSWERS
// =====================================================

restore();
