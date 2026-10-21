const form = document.getElementById('survey-form');
const STORAGE_KEY = 'skillbridge_survey';

// Salary range slider
const payMin = document.getElementById('pay-min');
const payMax = document.getElementById('pay-max');
const payFill = document.getElementById('pay-fill');
const payRange = document.getElementById('pay-range');
const GAP = 10000;

const naira = (n) => '₦' + Number(n).toLocaleString('en-US');

function updateRange(changed) {
  let low = Number(payMin.value);
  let high = Number(payMax.value);
  if (high - low < GAP) {
    if (changed === payMin) low = high - GAP;
    else high = low + GAP;
    payMin.value = low;
    payMax.value = high;
  }
  const min = Number(payMin.min);
  const span = Number(payMin.max) - min;
  // 18px thumbs travel (width - 18px), so the fill follows the same scale
  payFill.style.left = `calc(9px + (100% - 18px) * ${(low - min) / span})`;
  payFill.style.width = `calc((100% - 18px) * ${(high - low) / span})`;
  payRange.textContent = `${naira(low)} – ${naira(high)}`;
}

[payMin, payMax].forEach((input) => {
  input.addEventListener('input', () => updateRange(input));
});

// Institution suggestions
const institution = document.getElementById('institution');

document.querySelectorAll('[data-institution]').forEach((chip) => {
  chip.addEventListener('click', () => {
    institution.value = chip.dataset.institution;
    institution.dispatchEvent(new Event('input', { bubbles: true }));
    institution.focus();
  });
});

// Auto-save
const saveStatus = document.getElementById('save-status');
let savedAt = null;

function readForm() {
  return Object.fromEntries(new FormData(form));
}

function timeAgo() {
  const minutes = Math.floor((Date.now() - savedAt) / 60000);
  if (minutes < 1) return 'just now';
  return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
}

function showStatus() {
  if (savedAt) saveStatus.textContent = `Step 1 of 4 • Auto-saved ${timeAgo()}`;
}

function save(completed = false) {
  savedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: readForm(), savedAt, completed }));
  showStatus();
}

function restore() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return;
  }
  if (!saved || !saved.data) return;

  Object.entries(saved.data).forEach(([name, value]) => {
    const fields = form.querySelectorAll(`[name="${name}"]`);
    fields.forEach((field) => {
      if (field.type === 'radio') field.checked = field.value === value;
      else field.value = value;
    });
  });
  updateRange();
  savedAt = saved.savedAt;
  showStatus();
}

let timer;
form.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => save(), 600);
});
form.addEventListener('change', () => save());
setInterval(showStatus, 30000);

// Continue to the next step
form.addEventListener('submit', (e) => {
  e.preventDefault();
  save(true);
  window.location.href = 'cv-upload.html';
});

restore();
