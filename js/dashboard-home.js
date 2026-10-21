const readStoredObject = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

const user = readStoredObject('skillbridge_user');
const survey = readStoredObject('skillbridge_survey');
const surveyData = survey.data || {};
const firstName = (surveyData.fullName || user.name || 'Amaka').trim().split(/\s+/)[0] || 'Candidate';
document.querySelectorAll('[data-candidate-name]').forEach((element) => { element.textContent = firstName; });
const lastName = (surveyData.fullName || user.name || 'Amaka Okafor').trim().split(/\s+/).at(-1) || '';
document.getElementById('topbar-user-name').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`;

const trackLabels = {
  'fintech-data': 'Junior Data Analyst',
  backend: 'Backend Engineer',
  'growth-product': 'Growth Product',
};
const track = trackLabels[surveyData.track] || 'Junior Data Analyst';
document.querySelectorAll('[data-track-name]').forEach((element) => { element.textContent = track; });
document.getElementById('topbar-user-track').textContent = `${track} Candidate`;

const sidebar = document.getElementById('dashboard-sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebarToggle = document.getElementById('dashboard-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  sidebarBackdrop.classList.toggle('hidden', !open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
  sidebarToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
sidebarToggle.addEventListener('click', () => setSidebarOpen(sidebarToggle.getAttribute('aria-expanded') !== 'true'));
sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) setSidebarOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebarOpen(false);
});

const dialog = document.getElementById('dashboard-action-dialog');
const title = document.getElementById('action-dialog-title');
const copy = document.getElementById('action-dialog-copy');
const dialogLink = document.getElementById('action-dialog-link');
const openDialog = (heading, message, linkText = '', linkHref = '') => {
  title.textContent = heading;
  copy.textContent = message;
  dialogLink.classList.toggle('hidden', !linkText);
  if (linkText) {
    dialogLink.textContent = linkText;
    dialogLink.href = linkHref;
  }
  dialog.showModal();
};

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => dialog.close());
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

const actionContent = {
  notes: ['Sprint 2 Review Notes', 'Practice multi-table joins, common table expressions, and window functions. The capstone milestone applies these patterns to anonymized Lagos commute data.', 'Continue Sprint', 'roadmap.html'],
  diagnostic: ['Retake Diagnostic', 'Your saved assessment score remains available while you retake the sample diagnostic. Open the assessment page to start a fresh benchmark.', 'Open Diagnostic', 'profile-review.html'],
  mentor: ['Mentor Office Hours', 'Mentor office hours are scheduled for Thursday at 4:00 PM West Africa Time. Add a reminder to your calendar and prepare one question about your current sprint.', '', ''],
  pro: ['SkillBridge Pro Advantage', 'Pro includes AI resume tools and direct recruiter introductions. Subscription checkout is not connected in this preview.', '', ''],
};
document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
  button.addEventListener('click', () => openDialog(...actionContent[button.dataset.dashboardAction]));
});

const searchForm = document.getElementById('dashboard-search-form');
const searchInput = document.getElementById('dashboard-search');
searchForm.addEventListener('submit', (event) => event.preventDefault());
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    jobCards.forEach((card) => card.classList.remove('hidden'));
    emptyState.classList.add('hidden');
    stipendFilter.value = 'all';
    return;
  }
  let visibleCount = 0;
  jobCards.forEach((card) => {
    const visible = card.textContent.toLowerCase().includes(query);
    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount += 1;
  });
  emptyState.textContent = 'No matching job cards. Try another role, skill, or company.';
  emptyState.classList.toggle('hidden', visibleCount > 0);
});

document.querySelectorAll('[data-quick-view]').forEach((button) => {
  button.addEventListener('click', () => openDialog('Role preview', `${button.dataset.quickView}. Review the listed skills and salary range, then use Direct Apply to continue through your candidate account.`, 'Browse opportunities', 'opportunities.html'));
});

const insightCopy = {
  Moniepoint: 'Your capstone SQL work and PostgreSQL practice are a strong match for this role’s merchant transaction analysis. Add a public project link to strengthen your application.',
  'Sterling Bank': 'Your financial modeling and Excel credentials align with the role’s business analysis requirements. Include a concise example of a model you have built.',
  PiggyVest: 'Your Python and cohort analysis experience fits the growth analytics focus. A retention analysis project would help demonstrate this match.',
};
document.querySelectorAll('[data-why]').forEach((button) => {
  button.addEventListener('click', () => openDialog(`${button.dataset.why} match insight`, insightCopy[button.dataset.why]));
});

const stipendFilter = document.getElementById('stipend-filter');
const jobCards = [...document.querySelectorAll('.job-card')];
const emptyState = document.getElementById('filter-empty');
stipendFilter.addEventListener('change', () => {
  searchInput.value = '';
  const minimum = Number(stipendFilter.value) || 0;
  let visibleCount = 0;
  jobCards.forEach((card) => {
    const visible = Number(card.dataset.minStipend) >= minimum;
    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount += 1;
  });
  emptyState.classList.toggle('hidden', visibleCount > 0);
  emptyState.textContent = 'No roles meet that stipend filter. Try a lower minimum.';
});

const joinButton = document.getElementById('join-study-room');
const updateJoinButton = () => {
  const joined = localStorage.getItem('skillbridgeDashboardStudyRoom') === 'true';
  joinButton.innerHTML = joined
    ? '<i class="ph ph-check-circle"></i>Joined Study Room'
    : '<i class="ph ph-chats"></i>Join Live Study Room';
  joinButton.setAttribute('aria-pressed', String(joined));
};
joinButton.addEventListener('click', () => {
  const joined = localStorage.getItem('skillbridgeDashboardStudyRoom') === 'true';
  localStorage.setItem('skillbridgeDashboardStudyRoom', String(!joined));
  updateJoinButton();
  openDialog(joined ? 'You left the study room' : 'You joined the study room', joined ? 'You can rejoin the Lekki-Yaba Analyst Peer Squad any time.' : 'You are on the peer squad list. Study room access is shown here as a prototype interaction.');
});
updateJoinButton();
