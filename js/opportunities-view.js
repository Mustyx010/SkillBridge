const safeRead = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};

const profile = safeRead('skillbridge_user', {});
const survey = safeRead('skillbridge_survey', {});
const candidateName = survey.data?.fullName || profile.name || 'Amaka Okafor';
const candidateFirst = candidateName.trim().split(/\s+/)[0] || 'Candidate';
const candidateLast = candidateName.trim().split(/\s+/).at(-1) || '';
document.getElementById('opportunities-user-name').textContent = `${candidateFirst} ${candidateLast ? `${candidateLast[0]}.` : ''}`;

const sidebar = document.getElementById('opportunities-sidebar');
const backdrop = document.getElementById('opportunities-backdrop');
const menuButton = document.getElementById('opportunities-menu-button');
const toggleSidebar = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
menuButton.addEventListener('click', () => toggleSidebar(menuButton.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => toggleSidebar(false));
sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) toggleSidebar(false); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleSidebar(false); });

const cards = [...document.querySelectorAll('.opportunity-card')];
const searchInput = document.getElementById('opportunity-search');
const locationFilter = document.getElementById('location-filter');
const globalSearch = document.getElementById('global-opportunity-query');
const filterForm = document.getElementById('opportunity-filters');
const resultCount = document.getElementById('opportunity-count');
const status = document.getElementById('opportunity-status');
const emptyState = document.getElementById('opportunity-empty');
const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
globalSearch.value = initialQuery;
searchInput.value = initialQuery;

const detail = {
  company: document.getElementById('detail-company'),
  role: document.getElementById('detail-role'),
  recruitment: document.getElementById('detail-recruitment'),
  closing: document.getElementById('detail-close'),
  sector: document.getElementById('detail-sector'),
  team: document.getElementById('detail-team'),
  location: document.getElementById('detail-location'),
  salary: document.getElementById('detail-salary'),
  fit: document.getElementById('detail-fit'),
  rationale: document.getElementById('detail-rationale'),
  icon: document.getElementById('detail-company-icon'),
};
let selectedCard = cards[0];
const selectCard = (card) => {
  if (!card) return;
  selectedCard = card;
  cards.forEach((item) => {
    const selected = item === card;
    item.setAttribute('aria-selected', String(selected));
    item.classList.toggle('border-l-4', selected);
    item.classList.toggle('border-[#731F94]', selected);
    item.classList.toggle('shadow-[0_3px_14px_rgba(24,20,69,0.08)]', selected);
  });
  detail.company.textContent = card.dataset.company;
  detail.role.textContent = card.dataset.role;
  detail.recruitment.textContent = card.dataset.recruitment;
  detail.closing.textContent = card.dataset.close;
  detail.team.innerHTML = `<i class="ph ph-users-three text-[#731F94]"></i>${card.dataset.team}`;
  detail.location.innerHTML = `<i class="ph ph-buildings text-[#731F94]"></i>${card.dataset.work}`;
  detail.salary.textContent = card.dataset.salary;
  detail.fit.textContent = `${card.dataset.fit}%`;
  detail.rationale.textContent = card.dataset.rationale;
  const cardIcon = card.querySelector('.ph');
  detail.icon.className = cardIcon ? cardIcon.className : 'ph ph-briefcase';
  updateSaveState();
};

let savedRoles = new Set(safeRead('skillbridgeSavedRoles', []));
const selectedRole = () => selectedCard?.dataset.role || '';
const updateSaveState = () => {
  const saved = savedRoles.has(selectedRole());
  const detailSave = document.getElementById('detail-save');
  const footerSave = document.getElementById('save-selected-role');
  detailSave.setAttribute('aria-pressed', String(saved));
  detailSave.setAttribute('aria-label', saved ? 'Remove saved opening' : 'Save this opening');
  detailSave.innerHTML = saved ? '<i class="ph ph-bookmark-simple-fill"></i>' : '<i class="ph ph-bookmark-simple"></i>';
  footerSave.setAttribute('aria-pressed', String(saved));
  footerSave.innerHTML = saved ? '<i class="ph ph-bookmark-simple-fill"></i>Saved for Later' : '<i class="ph ph-bookmark-simple"></i>Save for Later';
  footerSave.classList.toggle('bg-[#731F94]', saved);
  footerSave.classList.toggle('text-white', saved);
  document.getElementById('saved-count').textContent = String(savedRoles.size);
};
const toggleSaved = () => {
  const role = selectedRole();
  if (savedRoles.has(role)) savedRoles.delete(role);
  else savedRoles.add(role);
  localStorage.setItem('skillbridgeSavedRoles', JSON.stringify([...savedRoles]));
  updateSaveState();
};
document.getElementById('detail-save').addEventListener('click', toggleSaved);
document.getElementById('save-selected-role').addEventListener('click', toggleSaved);
cards.forEach((card) => card.addEventListener('click', () => selectCard(card)));
selectCard(selectedCard);

const updateVisibleCount = () => {
  const visible = cards.filter((card) => !card.hidden);
  resultCount.textContent = String(visible.length);
  emptyState.classList.toggle('hidden', visible.length > 0);
  if (visible.length && (!selectedCard || selectedCard.hidden)) selectCard(visible[0]);
};
filterForm.addEventListener('input', () => {
  globalSearch.value = searchInput.value;
  document.getElementById('clear-opportunity-search').classList.toggle('hidden', !searchInput.value);
  requestAnimationFrame(updateVisibleCount);
});
filterForm.addEventListener('change', () => requestAnimationFrame(updateVisibleCount));
filterForm.addEventListener('submit', (event) => { event.preventDefault(); requestAnimationFrame(updateVisibleCount); });
globalSearch.addEventListener('input', () => {
  searchInput.value = globalSearch.value;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
});
document.getElementById('global-opportunity-search').addEventListener('submit', (event) => event.preventDefault());
document.getElementById('clear-opportunity-search').addEventListener('click', () => {
  searchInput.value = '';
  globalSearch.value = '';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
});

document.querySelectorAll('[data-location-chip]').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.locationChip;
    locationFilter.value = value === 'hybrid' ? 'flexible' : value;
    document.querySelectorAll('[data-location-chip]').forEach((item) => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      item.classList.toggle('bg-[#BF39E8]', active);
      item.classList.toggle('text-white', active);
      item.classList.toggle('bg-[#F5F0FD]', !active);
    });
    locationFilter.dispatchEvent(new Event('change', { bubbles: true }));
  });
});

const dialog = document.getElementById('opportunities-dialog');
const showInfo = (heading, message) => {
  document.getElementById('opportunities-dialog-title').textContent = heading;
  document.getElementById('opportunities-dialog-copy').textContent = message;
  dialog.showModal();
};
document.querySelectorAll('[data-close-opportunities-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
document.getElementById('employer-fast-track').addEventListener('click', () => showInfo('Verified Employer Fast-Track', 'Verified partners review candidates with validated skills and a complete SkillBridge Passport. Your strongest matches appear first in this list.'));
document.getElementById('detail-share').addEventListener('click', async () => {
  const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(selectedRole().toLowerCase().replace(/\s+/g, '-'))}`;
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById('share-status').textContent = 'Role link copied';
  } catch {
    document.getElementById('share-status').textContent = url;
  }
});
