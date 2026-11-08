const sessionUser = window.SkillBridgeApi.session()?.user;
const name = sessionUser?.fullName || 'Candidate';
const firstName = name.trim().split(/\s+/)[0] || 'Candidate';
const lastName = name.trim().split(/\s+/).at(-1) || '';
document.getElementById('skill-gap-user-name').textContent = `${firstName} ${lastName && lastName !== firstName ? `${lastName[0]}.` : ''}`;
document.querySelector('header span.ml-auto')?.remove();
document.title = 'Skill Gap Analysis | SkillBridge';

const sidebar = document.getElementById('skill-gap-sidebar');
const backdrop = document.getElementById('skill-gap-backdrop');
const menuButton = document.getElementById('skill-gap-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
menuButton.addEventListener('click', () => setSidebarOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => {
  if (event.target.closest('a')) setSidebarOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebarOpen(false);
});

const grid = document.getElementById('matrix-grid');
const cardView = document.getElementById('card-view-button');
const hierarchyView = document.getElementById('hierarchy-view-button');
const summarySection = document.querySelector('[aria-label="Skill gap summary"]');
const heroSection = document.querySelector('[aria-labelledby="page-title"]');
const benchmarkSection = document.querySelector('[aria-label="National benchmark and credential"]');
let cards = [];

heroSection?.replaceChildren();
if (heroSection) {
  const heading = document.createElement('h1');
  heading.id = 'page-title';
  heading.className = 'text-3xl font-extrabold tracking-tight sm:text-4xl';
  heading.textContent = 'Your Skill Gap Analysis';
  const description = document.createElement('p');
  description.className = 'mt-2 text-sm leading-6 text-[#625B6D]';
  description.textContent = 'Skills and development areas below come from your saved CV analysis.';
  heroSection.append(heading, description);
}

const makeElement = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
};

if (summarySection) {
  summarySection.replaceChildren();
  summarySection.className = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4';
  summarySection.setAttribute('aria-label', 'API skill gap summary');
  summarySection.dataset.apiSummary = '';
  summarySection.setAttribute('aria-busy', 'true');
  [
    ['Analysis status', 'Loading…'],
    ['Current skills', '—'],
    ['Required skills', '—'],
    ['Skills to develop', '—'],
  ].forEach(([label, value]) => {
    const card = makeElement('article', 'rounded-xl bg-white p-5 shadow-sm', '');
    card.append(
      makeElement('p', 'text-[10px] font-bold uppercase tracking-wide text-[#81798B]', label),
      makeElement('p', 'mt-3 text-3xl font-extrabold text-[#731F94]', value),
    );
    summarySection.append(card);
  });
}

const matrixSection = grid.closest('section');
const matrixTitle = matrixSection?.querySelector('#matrix-title');
if (matrixTitle) matrixTitle.textContent = 'Skills to develop';
cardView.parentElement.hidden = true;
const matrixDescription = matrixSection?.querySelector('h2 + p');
if (matrixDescription) matrixDescription.textContent = 'Current, required, and missing skills returned by your CV analysis.';
grid.replaceChildren();
benchmarkSection?.remove();

const gapPanel = document.createElement('section');
gapPanel.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';
gapPanel.setAttribute('aria-labelledby', 'api-skill-gap-title');
const gapTitle = document.createElement('h2');
gapTitle.id = 'api-skill-gap-title';
gapTitle.className = 'text-lg font-bold text-[#731F94]';
gapTitle.textContent = 'Your API skill-gap analysis';
const gapStatus = document.createElement('p');
gapStatus.className = 'mt-2 text-sm text-[#625B6D]';
gapStatus.setAttribute('role', 'status');
const gapDetails = document.createElement('div');
gapDetails.className = 'mt-4 grid gap-4 md:grid-cols-3';
gapPanel.append(gapTitle, gapStatus, gapDetails);
grid.before(gapPanel);

const renderGapList = (label, skills) => {
  const section = document.createElement('div');
  section.className = 'rounded-xl bg-[#F8F4FF] p-4';
  const heading = document.createElement('h3');
  heading.className = 'text-xs font-bold uppercase text-[#731F94]';
  heading.textContent = label;
  const list = document.createElement('ul');
  list.className = 'mt-2 space-y-1 text-xs text-[#4A4455]';
  (Array.isArray(skills) && skills.length ? skills : ['No skills returned']).forEach((skill) => {
    const item = document.createElement('li');
    item.textContent = skill;
    list.append(item);
  });
  section.append(heading, list);
  return section;
};

const setSummary = (gap, fallbackStatus = 'No analysis') => {
  const values = gap
    ? [
      gap.status || 'Unknown',
      String(gap.currentSkills?.length || 0),
      String(gap.requiredSkills?.length || 0),
      String(gap.missingSkills?.length || 0),
    ]
    : [fallbackStatus, '—', '—', '—'];
  summarySection?.querySelectorAll('article p:last-child').forEach((value, index) => {
    value.textContent = values[index];
  });
  summarySection?.setAttribute('aria-busy', 'false');
};

const applySkillSearch = () => {
  const query = document.getElementById('skill-gap-search').value.trim().toLowerCase();
  let visibleCount = 0;
  cards.forEach((card) => {
    const matches = !query || card.textContent.toLowerCase().includes(query);
    card.classList.toggle('hidden', !matches);
    if (matches) visibleCount += 1;
  });
  document.getElementById('skill-search-empty').classList.toggle('hidden', visibleCount > 0 || !cards.length);
};

const addSkillToRoadmap = async (skill, button) => {
  const stopLoading = window.SkillBridgeApi.setLoading(button, 'Adding to roadmap…');
  try {
    const skillGapId = localStorage.getItem('skillbridgeSkillGapId');
    if (!skillGapId) throw new Error('Analyze your CV before adding a skill to a roadmap.');
    let response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
    let data = window.SkillBridgeApi.unwrap(response);
    let roadmaps = Array.isArray(data) ? data : data?.items || [];
    let roadmap = roadmaps.find((item) => item.skillGapId === skillGapId);
    if (!roadmap) {
      await window.SkillBridgeApi.post('/api/v1/roadmaps/generate', { skillGapId });
      response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
      data = window.SkillBridgeApi.unwrap(response);
      roadmaps = Array.isArray(data) ? data : data?.items || [];
      roadmap = roadmaps.find((item) => item.skillGapId === skillGapId);
    }
    if (!roadmap?.id) throw new Error('The API did not return a roadmap ID.');
    await window.SkillBridgeApi.post(`/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}/tasks`, {
      phase: 60,
      title: `Develop ${skill}`,
      description: `Practice and demonstrate ${skill} for your target career.`,
      taskType: 'learn',
      skill: skill.toLowerCase(),
      status: 'todo',
    });
    stopLoading();
    button.textContent = 'Added to roadmap';
    button.disabled = true;
    showDialog('Added to your roadmap', `${skill} has been saved to your API roadmap.`);
  } catch (error) {
    stopLoading();
    showDialog('Could not update your roadmap', error.message);
  }
};

const renderSkillGap = (gap) => {
  if (!gap || !gap.id) throw new Error('The API did not return a valid skill-gap analysis.');
  localStorage.setItem('skillbridgeSkillGapId', gap.id);
  setSummary(gap);
  gapTitle.textContent = gap.targetJobTitle || 'Your CV skill-gap analysis';
  gapStatus.textContent = `Analysis status: ${gap.status || 'unknown'}${gap.updatedAt ? ` • Updated ${new Date(gap.updatedAt).toLocaleDateString()}` : ''}`;
  gapDetails.replaceChildren(
    renderGapList('Current skills', gap.currentSkills),
    renderGapList('Required skills', gap.requiredSkills),
    renderGapList('Skills to develop', gap.missingSkills),
  );
  grid.replaceChildren();

  const missingSkills = Array.isArray(gap.missingSkills) ? gap.missingSkills : [];
  missingSkills.forEach((skill) => {
    const card = makeElement('article', 'matrix-card rounded-xl bg-white p-4 shadow-sm', '');
    card.append(
      makeElement('h3', 'text-sm font-bold', skill),
      makeElement('p', 'mt-2 text-xs text-[#625B6D]', 'Identified as a skill to develop in your CV analysis.'),
    );
    const button = makeElement('button', 'mt-3 w-full rounded-lg bg-[#731F94] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#8F08B8]', 'Add to roadmap');
    button.type = 'button';
    button.addEventListener('click', () => addSkillToRoadmap(skill, button));
    card.append(button);
    grid.append(card);
  });
  cards = [...grid.querySelectorAll('.matrix-card')];
  if (!cards.length) {
    grid.append(makeElement('p', 'rounded-xl bg-white p-5 text-sm text-[#625B6D]', 'This analysis did not return skills to develop.'));
  }
  applySkillSearch();
};

const loadApiSkillGap = async () => {
  if (!window.SkillBridgeApi.session()) {
    setSummary(null, 'Sign in required');
    gapStatus.textContent = 'Sign in to load your saved skill-gap analysis.';
    const link = makeElement('a', 'mt-3 inline-flex font-semibold text-[#731F94] underline', 'Sign in');
    link.href = 'signin.html';
    gapDetails.replaceChildren(link);
    grid.replaceChildren();
    return;
  }
  gapStatus.textContent = 'Loading your skill-gap analysis…';
  gapStatus.setAttribute('aria-busy', 'true');
  try {
    const response = await window.SkillBridgeApi.get('/api/v1/skill-gaps');
    const gaps = window.SkillBridgeApi.unwrap(response);
    if (!Array.isArray(gaps)) throw new Error('The API returned an invalid skill-gap list.');
    const storedId = localStorage.getItem('skillbridgeSkillGapId');
    const gap = gaps.find((item) => item.id === storedId)
      || [...gaps].sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0];
    if (!gap) {
      setSummary(null);
      gapStatus.textContent = 'No skill-gap analysis is saved yet. Upload your CV and continue to generate one.';
      const link = makeElement('a', 'mt-3 inline-flex font-semibold text-[#731F94] underline', 'Upload and analyze your CV');
      link.href = 'cv-upload.html';
      gapDetails.replaceChildren(link);
      grid.replaceChildren();
      return;
    }
    renderSkillGap(gap);
  } catch (error) {
    setSummary(null, 'Unavailable');
    gapStatus.classList.add('text-red-700');
    gapStatus.textContent = `Skill-gap data could not be loaded: ${error.message}`;
  }
};
loadApiSkillGap();

const setView = (hierarchy) => {
  grid.classList.toggle('lg:grid-cols-3', !hierarchy);
  grid.classList.toggle('lg:grid-cols-1', hierarchy);
  cardView.classList.toggle('bg-white', !hierarchy);
  cardView.classList.toggle('text-[#731F94]', !hierarchy);
  cardView.classList.toggle('shadow-sm', !hierarchy);
  cardView.classList.toggle('text-[#625B6D]', hierarchy);
  hierarchyView.classList.toggle('bg-white', hierarchy);
  hierarchyView.classList.toggle('text-[#731F94]', hierarchy);
  hierarchyView.classList.toggle('shadow-sm', hierarchy);
  hierarchyView.classList.toggle('text-[#625B6D]', !hierarchy);
  cardView.setAttribute('aria-pressed', String(!hierarchy));
  hierarchyView.setAttribute('aria-pressed', String(hierarchy));
};
cardView.addEventListener('click', () => setView(false));
hierarchyView.addEventListener('click', () => setView(true));

const searchForm = document.getElementById('skill-gap-search-form');
const searchInput = document.getElementById('skill-gap-search');
const noResults = document.getElementById('skill-search-empty');
searchForm.addEventListener('submit', (event) => event.preventDefault());
searchInput.addEventListener('input', applySkillSearch);

const dialog = document.getElementById('skill-gap-dialog');
const dialogTitle = document.getElementById('skill-gap-dialog-title');
const dialogCopy = document.getElementById('skill-gap-dialog-copy');
const showDialog = (heading, message) => {
  dialogTitle.textContent = heading;
  dialogCopy.textContent = message;
  dialog.showModal();
};
document.querySelectorAll('[data-close-skill-gap-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
