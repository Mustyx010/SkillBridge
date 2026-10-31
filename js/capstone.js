const CAPSTONE_STORAGE_KEY = 'skillbridge_capstone';
const CAPSTONE_MILESTONES = ['dataset', 'queries', 'findings', 'publish'];

const readCapstoneState = () => {
  try {
    const value = JSON.parse(localStorage.getItem(CAPSTONE_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

const capstoneState = readCapstoneState();
const repoInput = document.getElementById('roadmap-repo-url');
const datasetInput = document.getElementById('roadmap-dataset-url');
const notesInput = document.getElementById('roadmap-project-notes');
const saveStatus = document.getElementById('capstone-save-status');
const milestoneInputs = [...document.querySelectorAll('.capstone-milestone')];
const savedMilestones = Array.isArray(capstoneState.milestones) ? capstoneState.milestones : [];

repoInput.value = capstoneState.repo || '';
datasetInput.value = capstoneState.dataset || '';
notesInput.value = capstoneState.notes || '';
milestoneInputs.forEach((input) => { input.checked = savedMilestones.includes(input.value); });

const getReadiness = () => ({
  repo: Boolean(repoInput.value.trim()),
  dataset: Boolean(datasetInput.value.trim()),
  notes: Boolean(notesInput.value.trim()),
});

const updateReadiness = () => {
  const readiness = getReadiness();
  const items = {
    repo: ['capstone-repo-check', 'Repository link saved', 'Add a repository link'],
    dataset: ['capstone-dataset-check', 'Dataset source documented', 'Add a dataset source'],
    notes: ['capstone-notes-check', 'Analysis notes added', 'Add analysis notes'],
  };
  Object.entries(items).forEach(([key, [id, readyText, missingText]]) => {
    const label = document.getElementById(id);
    const icon = document.querySelector(`[data-readiness-icon="${key}"]`);
    label.textContent = readiness[key] ? readyText : missingText;
    icon.className = readiness[key]
      ? 'ph ph-check-circle text-[#731F94]'
      : 'ph ph-circle text-[#C8BED5]';
  });
};

const updateProgress = () => {
  const completed = milestoneInputs.filter((input) => input.checked).length;
  const percent = Math.round(completed / CAPSTONE_MILESTONES.length * 100);
  document.getElementById('capstone-milestone-count').textContent = `${completed} of ${CAPSTONE_MILESTONES.length}`;
  document.getElementById('capstone-progress-percent').textContent = `${percent}%`;
  document.getElementById('capstone-progress-bar').style.width = `${percent}%`;
  document.getElementById('capstone-progress-ring').setAttribute('aria-label', `${percent}% of project milestones complete`);
  document.getElementById('capstone-progress-copy').textContent = completed === CAPSTONE_MILESTONES.length
    ? 'All milestones are marked complete.'
    : 'Your progress is saved in this browser.';
};

const saveCapstoneState = (message) => {
  const nextState = {
    ...readCapstoneState(),
    repo: repoInput.value.trim(),
    dataset: datasetInput.value.trim(),
    notes: notesInput.value.trim(),
    milestones: milestoneInputs.filter((input) => input.checked).map((input) => input.value),
  };
  try {
    localStorage.setItem(CAPSTONE_STORAGE_KEY, JSON.stringify(nextState));
    Object.assign(capstoneState, nextState);
    if (message) saveStatus.textContent = message;
    return true;
  } catch (error) {
    console.error('Unable to save capstone progress.', error);
    saveStatus.textContent = 'Could not save your progress in this browser.';
    return false;
  }
};

const updateProject = () => {
  updateReadiness();
  updateProgress();
  saveCapstoneState('Saved in this browser.');
};

milestoneInputs.forEach((input) => input.addEventListener('change', updateProject));
[repoInput, datasetInput, notesInput].forEach((input) => input.addEventListener('input', () => {
  updateReadiness();
  saveCapstoneState('Saved in this browser.');
}));

document.getElementById('capstone-submission-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!saveCapstoneState('Project details saved in this browser. No review request was sent.')) return;
});

document.getElementById('capstone-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = document.getElementById('capstone-search').value.trim();
  if (query) window.location.href = `opportunities.html?q=${encodeURIComponent(query)}`;
});

updateReadiness();
updateProgress();
