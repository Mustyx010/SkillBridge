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
  (Array.isArray(skills) && skills.length ? skills : ['None listed']).forEach((skill) => {
    const item = document.createElement('li');
    item.textContent = skill;
    list.append(item);
  });
  section.append(heading, list);
  return section;
};

const loadApiSkillGap = async () => {
  if (!window.SkillBridgeApi.session()) {
    gapStatus.textContent = 'Sign in to load your saved skill-gap analysis.';
    return;
  }
  gapStatus.textContent = 'Loading your skill-gap analysis…';
  try {
    const response = await window.SkillBridgeApi.get('/api/v1/skill-gaps');
    const gaps = window.SkillBridgeApi.unwrap(response);
    if (!Array.isArray(gaps)) throw new Error('The API returned an invalid skill-gap list.');
    const storedId = localStorage.getItem('skillbridgeSkillGapId');
    const gap = gaps.find((item) => item.id === storedId) || gaps[0];
    if (!gap) {
      gapStatus.textContent = 'No skill-gap analysis is saved yet. Upload and analyze a CV to create one.';
      return;
    }
    localStorage.setItem('skillbridgeSkillGapId', gap.id);
    gapStatus.textContent = `${gap.targetJobTitle || 'Career target'} • ${gap.status || 'analysis'} • The benchmark cards below are prototype content.`;
    gapDetails.replaceChildren(
      renderGapList('Current skills', gap.currentSkills),
      renderGapList('Required skills', gap.requiredSkills),
      renderGapList('Skills to develop', gap.missingSkills),
    );
  } catch (error) {
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
    button.disabled = true;
  }
  button.addEventListener('click', async () => {
    if (roadmapPriorities.includes(skill)) return;
    button.disabled = true;
    try {
      if (window.SkillBridgeApi.session()) {
        let response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
        let data = window.SkillBridgeApi.unwrap(response);
        let roadmaps = Array.isArray(data) ? data : data?.items || [];
        if (!roadmaps.length) {
          const skillGapId = localStorage.getItem('skillbridgeSkillGapId');
          if (!skillGapId) throw new Error('Analyze your CV before adding a skill to an API roadmap.');
          await window.SkillBridgeApi.post('/api/v1/roadmaps/generate', { skillGapId });
          response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
          data = window.SkillBridgeApi.unwrap(response);
          roadmaps = Array.isArray(data) ? data : data?.items || [];
        }
        const roadmap = roadmaps[0];
        if (!roadmap?.id) throw new Error('The API did not return a roadmap ID.');
        await window.SkillBridgeApi.post(`/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}/tasks`, {
          phase: 60,
          title: `Develop ${skill}`,
          description: `Practice and demonstrate ${skill} for your target career.`,
          taskType: 'learn',
          skill: skill.toLowerCase(),
          status: 'todo',
        });
      } else {
        gapStatus.textContent = 'No API session found; this priority will only be saved in this browser.';
      }
      if (!roadmapPriorities.includes(skill)) roadmapPriorities.push(skill);
      localStorage.setItem(roadmapKey, JSON.stringify(roadmapPriorities));
      localStorage.setItem('skillbridgeRoadmapActivated', 'true');
      button.innerHTML = '<i class="ph ph-check-circle"></i>Added to 60-Day Roadmap';
      button.classList.remove('bg-[#731F94]');
      button.classList.add('bg-[#397B65]');
      showDialog('Added to your roadmap', `${skill} has been saved to your ${window.SkillBridgeApi.session() ? 'API roadmap and local priorities' : 'local 60-Day Roadmap priorities'}.`);
    } catch (error) {
      showDialog('Could not update your roadmap', error.message);
    } finally {
      button.disabled = false;
    }
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
