const storedObject = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

const survey = storedObject('skillbridge_survey');
const account = storedObject('skillbridge_user');
const name = survey.data?.fullName || account.name || 'Amaka Okafor';
const firstName = name.trim().split(/\s+/)[0] || 'Candidate';
const lastName = name.trim().split(/\s+/).at(-1) || '';
document.getElementById('skill-gap-user-name').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`;
document.getElementById('benchmark-candidate-name').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`;
document.getElementById('certificate-candidate').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`;

const savedScore = localStorage.getItem('skillbridgeDiagnosticScore');
if (savedScore !== null) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(savedScore) / 3) * 100)));
  document.getElementById('evaluation-score').textContent = `${percent}%`;
}

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

const cards = [...document.querySelectorAll('.matrix-card')];
const grid = document.getElementById('matrix-grid');
const cardView = document.getElementById('card-view-button');
const hierarchyView = document.getElementById('hierarchy-view-button');
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
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  let matchCount = 0;
  cards.forEach((card) => {
    const matches = !query || `${card.dataset.search} ${card.textContent}`.toLowerCase().includes(query);
    card.classList.toggle('hidden', !matches);
    if (matches) matchCount += 1;
  });
  grid.querySelectorAll(':scope > section').forEach((group) => {
    const hasMatches = [...group.querySelectorAll('.matrix-card')].some((card) => !card.classList.contains('hidden'));
    group.classList.toggle('hidden', !hasMatches);
  });
  noResults.classList.toggle('hidden', matchCount > 0);
});

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

const roadmapKey = 'skillbridgeRoadmapPriorities';
let roadmapPriorities = [];
try {
  const saved = JSON.parse(localStorage.getItem(roadmapKey) || '[]');
  if (Array.isArray(saved)) roadmapPriorities = saved;
} catch { roadmapPriorities = []; }
document.querySelectorAll('[data-add-roadmap]').forEach((button) => {
  const skill = button.dataset.addRoadmap;
  if (roadmapPriorities.includes(skill)) {
    button.innerHTML = '<i class="ph ph-check-circle"></i>Added to 60-Day Roadmap';
    button.classList.remove('bg-[#731F94]');
    button.classList.add('bg-[#397B65]');
  }
  button.addEventListener('click', () => {
    if (!roadmapPriorities.includes(skill)) roadmapPriorities.push(skill);
    localStorage.setItem(roadmapKey, JSON.stringify(roadmapPriorities));
    localStorage.setItem('skillbridgeRoadmapActivated', 'true');
    button.innerHTML = '<i class="ph ph-check-circle"></i>Added to 60-Day Roadmap';
    button.classList.remove('bg-[#731F94]');
    button.classList.add('bg-[#397B65]');
    showDialog('Added to your roadmap', `${skill} has been saved to your 60-Day Roadmap priorities.`);
  });
});

const peerButton = document.getElementById('peer-study-circle');
const updatePeerButton = () => {
  const joined = localStorage.getItem('skillbridgeGapStudyCircle') === 'true';
  peerButton.setAttribute('aria-pressed', String(joined));
  peerButton.querySelector('strong').textContent = joined ? 'Joined Peer Study Circle #14' : 'Peer Study Circle #14';
};
peerButton.addEventListener('click', () => {
  const joined = localStorage.getItem('skillbridgeGapStudyCircle') === 'true';
  localStorage.setItem('skillbridgeGapStudyCircle', String(!joined));
  updatePeerButton();
  showDialog(joined ? 'You left the study circle' : 'You joined the study circle', joined ? 'You can rejoin the SQL study circle at any time.' : 'Your seat is saved for tonight’s 7:00 PM WAT SQL window functions study session.');
});
updatePeerButton();

document.getElementById('download-certificate').addEventListener('click', () => {
  document.getElementById('credential-status').textContent = 'Use “Save as PDF” in the print dialog to download your credential.';
  window.print();
});

const credentialStatus = document.getElementById('credential-status');
document.getElementById('copy-credential-link').addEventListener('click', async () => {
  const url = `${window.location.origin}${window.location.pathname}#verified-skill-index`;
  try {
    await navigator.clipboard.writeText(url);
    credentialStatus.textContent = 'Verifiable employer URL copied.';
  } catch {
    credentialStatus.textContent = url;
  }
});
