const safeRead = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
function filterOpportunityCards() {
  const query = searchInput.value.trim().toLowerCase();
  const location = locationFilter.value;
  cards.forEach((card) => {
    const matchesQuery = !query || `${card.dataset.role} ${card.dataset.company} ${card.textContent}`.toLowerCase().includes(query);
    const matchesLocation = location === 'all'
      || card.dataset.location === location
      || (location === 'nysc' && card.dataset.eligibility === 'nysc')
      || (location === 'flexible' && ['hybrid', 'remote'].includes(card.dataset.location));
    card.hidden = !matchesQuery || !matchesLocation;
  });
  updateVisibleCount();
}

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

let cards = [...document.querySelectorAll('.opportunity-card')];
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
  apply: document.getElementById('apply-selected-role'),
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
  const teamIcon = document.createElement('i');
  teamIcon.className = 'ph ph-users-three text-[#731F94]';
  detail.team.replaceChildren(teamIcon, document.createTextNode(card.dataset.team));
  const locationIcon = document.createElement('i');
  locationIcon.className = 'ph ph-buildings text-[#731F94]';
  detail.location.replaceChildren(locationIcon, document.createTextNode(card.dataset.work));
  detail.salary.textContent = card.dataset.salary;
  detail.fit.textContent = card.dataset.fit === '—' ? 'Not calculated' : `${card.dataset.fit}%`;
  detail.rationale.textContent = card.dataset.rationale;
  if (card.dataset.apiOpportunity === 'true') {
    const applicationUrl = card.dataset.applicationUrl;
    let safeUrl = '';
    try {
      const parsedUrl = new URL(applicationUrl);
      if (['http:', 'https:'].includes(parsedUrl.protocol)) safeUrl = parsedUrl.href;
    } catch { safeUrl = ''; }
    if (safeUrl) {
      detail.apply.href = safeUrl;
      detail.apply.target = '_blank';
      detail.apply.rel = 'noopener noreferrer';
      detail.apply.classList.remove('pointer-events-none', 'opacity-50');
      detail.apply.textContent = 'Apply on Employer Site';
    } else {
      detail.apply.href = '#';
      detail.apply.removeAttribute('target');
      detail.apply.removeAttribute('rel');
      detail.apply.classList.add('pointer-events-none', 'opacity-50');
      detail.apply.textContent = 'No application link available';
    }
  }
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
  requestAnimationFrame(filterOpportunityCards);
});
filterForm.addEventListener('change', () => requestAnimationFrame(filterOpportunityCards));
filterForm.addEventListener('submit', (event) => { event.preventDefault(); requestAnimationFrame(filterOpportunityCards); });
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

const opportunityList = document.getElementById('opportunity-list');
const opportunityStatus = document.getElementById('opportunity-status');
let matchScores = new Map();
const workModeLabel = (workMode) => ({
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
})[workMode] || 'Location not listed';
const daysRemaining = (deadline) => {
  if (!deadline) return 'Not specified';
  const deadlineTime = new Date(deadline).getTime();
  if (!Number.isFinite(deadlineTime)) return 'Not specified';
  const days = Math.ceil((deadlineTime - Date.now()) / 86400000);
  return days < 0 ? 'Closed' : `${days} days`;
};

const renderApiOpportunities = (opportunities) => {
  if (!Array.isArray(opportunities)) throw new Error('The API returned an invalid opportunities list.');
  opportunityList.replaceChildren();
  opportunities.forEach((opportunity) => {
    const match = matchScores.get(opportunity.id);
    const card = document.createElement('article');
    card.className = 'opportunity-card cursor-pointer rounded-2xl bg-white p-4 transition hover:shadow-md';
    card.dataset.role = opportunity.title || 'Untitled role';
    card.dataset.company = opportunity.company || 'Company not listed';
    card.dataset.location = opportunity.workMode || 'all';
    card.dataset.eligibility = 'all';
    card.dataset.fit = match ? String(match.matchPercentage) : '—';
    card.dataset.salary = 'Compensation not listed';
    card.dataset.work = [workModeLabel(opportunity.workMode), opportunity.location].filter(Boolean).join(' • ');
    card.dataset.sector = opportunity.category || opportunity.type || 'Opportunity';
    card.dataset.team = opportunity.type || 'Opportunity';
    card.dataset.close = daysRemaining(opportunity.deadline);
    card.dataset.recruitment = opportunity.id;
    card.dataset.rationale = match?.explanation
      || `Required skills: ${(opportunity.requiredSkills || []).join(', ') || 'Not specified'}`;
    card.dataset.applicationUrl = opportunity.applicationUrl || '';
    card.dataset.apiOpportunity = 'true';

    const heading = document.createElement('h2');
    heading.className = 'text-sm font-bold';
    heading.textContent = card.dataset.company;
    const role = document.createElement('p');
    role.className = 'mt-1 text-sm font-semibold text-[#731F94]';
    role.textContent = card.dataset.role;
    const meta = document.createElement('p');
    meta.className = 'mt-2 text-[10px] leading-5 text-[#625B6D]';
    meta.textContent = `${card.dataset.work} • ${card.dataset.sector}`;
    const matchLabel = document.createElement('span');
    matchLabel.className = 'mt-2 inline-flex rounded-full bg-[#EEE8FF] px-2 py-1 text-[10px] font-bold text-[#731F94]';
    matchLabel.textContent = match ? `${match.matchPercentage}% match` : 'Match not calculated';
    card.append(heading, role, meta, matchLabel);
    opportunityList.append(card);
  });
  cards = [...opportunityList.querySelectorAll('.opportunity-card')];
  cards.forEach((card) => card.addEventListener('click', () => selectCard(card)));
  selectedCard = cards[0] || null;
  selectCard(selectedCard);
  filterOpportunityCards();
};

const loadApiOpportunities = async () => {
  opportunityStatus.classList.remove('sr-only');
  opportunityStatus.textContent = 'Loading live opportunities…';
  try {
    const [opportunityResult, matchResult] = await Promise.allSettled([
      window.SkillBridgeApi.get('/api/v1/opportunities'),
      window.SkillBridgeApi.get('/api/v1/matching'),
    ]);
    if (opportunityResult.status === 'rejected') throw opportunityResult.reason;
    const opportunityResponse = opportunityResult.value;
    const listing = window.SkillBridgeApi.unwrap(opportunityResponse);
    const matches = matchResult.status === 'fulfilled'
      ? window.SkillBridgeApi.unwrap(matchResult.value)
      : [];
    const matchList = Array.isArray(matches) ? matches : [];
    matchScores = new Map(matchList.map((item) => {
      const opportunity = item.opportunity || item;
      return [item.opportunityId || opportunity.id, item];
    }));
    renderApiOpportunities(listing?.items || []);
    opportunityStatus.textContent = matchResult.status === 'rejected'
      ? `${cards.length} opportunities loaded, but match scores could not be fetched: ${matchResult.reason.message}`
      : `${cards.length} opportunities loaded from your account.`;
  } catch (error) {
    opportunityStatus.textContent = `Live opportunities could not be loaded: ${error.message}`;
  }
};

document.getElementById('employer-fast-track').addEventListener('click', async () => {
  try {
    opportunityStatus.classList.remove('sr-only');
    opportunityStatus.textContent = 'Generating profile-based opportunity matches…';
    await window.SkillBridgeApi.post('/api/v1/matching/generate');
    await loadApiOpportunities();
    showInfo('Matches refreshed', 'Your latest profile-based opportunity matches are shown in the list.');
  } catch (error) {
    showInfo('Could not generate matches', error.message);
  }
});

loadApiOpportunities();
document.getElementById('detail-share').addEventListener('click', async () => {
  const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(selectedRole().toLowerCase().replace(/\s+/g, '-'))}`;
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById('share-status').textContent = 'Role link copied';
  } catch {
    document.getElementById('share-status').textContent = url;
  }
});
