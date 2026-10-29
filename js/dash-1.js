const readObject = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const survey = readObject('skillbridge_survey');
const user = readObject('skillbridge_user');
const surveyData = survey.data || {};
const fullName = (surveyData.fullName || user.name || 'Amaka Okafor').trim();
const nameParts = fullName.split(/\s+/);
const firstName = nameParts[0] || 'Candidate';
const trackLabels = {
  'fintech-data': 'Junior Fintech Data Analyst',
  backend: 'Associate Backend Engineer',
  'growth-product': 'Growth Product Associate',
};
const track = trackLabels[surveyData.track] || 'Junior Fintech Data Analyst';

document.querySelectorAll('[data-candidate-name]').forEach((element) => {
  element.textContent = fullName;
});
document.getElementById('dashboard-user-name').textContent =
  `${firstName} ${nameParts.length > 1 ? `${nameParts[nameParts.length - 1][0]}.` : ''}`.trim();
document.getElementById('dashboard-user-track').textContent = track.replace(/^(Junior|Associate) /, '');
document.querySelectorAll('[data-track-name]').forEach((element) => {
  element.textContent = track;
});

const sidebar = document.getElementById('dashboard-sidebar');
const backdrop = document.getElementById('sidebar-backdrop');
const menuButton = document.getElementById('dashboard-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};

menuButton.addEventListener('click', () => {
  setSidebarOpen(menuButton.getAttribute('aria-expanded') !== 'true');
});
backdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => {
  if (event.target.closest('a')) setSidebarOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSidebarOpen(false);
    if (searchResults) searchResults.classList.add('hidden');
  }
});

const searchForm = document.getElementById('dashboard-search-form');
const searchInput = document.getElementById('dashboard-search');
const searchResults = document.getElementById('dashboard-search-results');
const roleCards = [...document.querySelectorAll('[data-role-card]')];
const searchTargets = [
  ...[...document.querySelectorAll('main section[aria-labelledby]')].map((section) => {
    const heading = document.getElementById(section.getAttribute('aria-labelledby'));
    return heading ? { title: heading.textContent.trim(), element: section } : null;
  }).filter(Boolean),
  ...roleCards.map((card) => ({
    title: card.querySelector('h3').textContent.trim(),
    element: card,
  })),
];

const showSearchResults = () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.replaceChildren();
  roleCards.forEach((card) => {
    card.classList.remove('hidden');
  });
  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  const matches = searchTargets
    .filter(({ title, element }) => `${title} ${element.textContent}`.toLowerCase().includes(query))
    .slice(0, 6);

  if (!matches.length) {
    const message = document.createElement('p');
    message.className = 'px-3 py-2 text-xs text-[#81798B]';
    message.textContent = 'No matching dashboard sections, skills, or roles.';
    searchResults.append(message);
  } else {
    matches.forEach(({ title, element }) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#181445] hover:bg-[#F5F0FD]';
      option.textContent = title;
      option.addEventListener('click', () => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-[#E08AFA]');
        window.setTimeout(() => element.classList.remove('ring-2', 'ring-[#E08AFA]'), 1400);
        searchResults.classList.add('hidden');
        searchInput.value = '';
      });
      searchResults.append(option);
    });
  }
  searchResults.classList.remove('hidden');
};

searchInput.addEventListener('input', showSearchResults);
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;
  const match = searchTargets.find(({ title, element }) =>
    `${title} ${element.textContent}`.toLowerCase().includes(query));
  if (match) {
    match.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchResults.classList.add('hidden');
  }
});
document.addEventListener('click', (event) => {
  if (!searchForm.contains(event.target)) searchResults.classList.add('hidden');
});

const savedRoles = new Set(readArray('skillbridgeDash1SavedRoles'));
const updateSavedRole = (button) => {
  const saved = savedRoles.has(button.dataset.saveRole);
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', `${saved ? 'Remove saved' : 'Save'} ${button.getAttribute('aria-label').replace(/^(Save|Remove saved) /, '')}`);
  button.innerHTML = `<i class="ph ${saved ? 'ph-bookmark-simple-fill' : 'ph-bookmark-simple'}"></i>`;
  button.classList.toggle('text-[#731F94]', saved);
};

document.querySelectorAll('[data-save-role]').forEach((button) => {
  updateSavedRole(button);
  button.addEventListener('click', () => {
    const key = button.dataset.saveRole;
    if (savedRoles.has(key)) savedRoles.delete(key);
    else savedRoles.add(key);
    localStorage.setItem('skillbridgeDash1SavedRoles', JSON.stringify([...savedRoles]));
    updateSavedRole(button);
  });
});

const savedTasks = localStorage.getItem('skillbridgeDash1CapstoneTasks');
const tasks = document.querySelectorAll('[data-capstone-task]');
if (savedTasks !== null) {
  const completedTasks = new Set(readArray('skillbridgeDash1CapstoneTasks'));
  tasks.forEach((task) => {
    task.checked = completedTasks.has(task.dataset.capstoneTask);
  });
}

const taskStatus = document.createElement('p');
taskStatus.className = 'mt-2 text-[10px] font-semibold text-[#81798B]';
taskStatus.setAttribute('role', 'status');
document.getElementById('capstone-actions').after(taskStatus);
const updateTaskStatus = () => {
  const completedTasks = [...tasks].filter((task) => task.checked);
  taskStatus.textContent = `${completedTasks.length} of ${tasks.length} capstone actions complete`;
  localStorage.setItem(
    'skillbridgeDash1CapstoneTasks',
    JSON.stringify(completedTasks.map((task) => task.dataset.capstoneTask)),
  );
};
tasks.forEach((task) => task.addEventListener('change', updateTaskStatus));
updateTaskStatus();

const messageDialog = document.getElementById('dashboard-message-dialog');
const showMessage = (title, message) => {
  document.getElementById('dashboard-message-title').textContent = title;
  document.getElementById('dashboard-message').textContent = message;
  messageDialog.showModal();
};
document.querySelectorAll('[data-dashboard-message]').forEach((button) => {
  button.addEventListener('click', () => showMessage('SkillBridge update', button.dataset.dashboardMessage));
});
document.querySelectorAll('[data-close-message]').forEach((button) => {
  button.addEventListener('click', () => messageDialog.close());
});
messageDialog.addEventListener('click', (event) => {
  if (event.target === messageDialog) messageDialog.close();
});
document.getElementById('notifications-button').addEventListener('click', () => {
  showMessage('Notifications', 'You’re all caught up. Interview, cohort, and assessment updates will appear here.');
});

const diagnosticDialog = document.getElementById('diagnostic-dialog');
const diagnosticForm = document.getElementById('diagnostic-form');
const diagnosticResult = document.getElementById('diagnostic-result');
const readinessScore = document.getElementById('readiness-score');
document.getElementById('close-diagnostic').addEventListener('click', () => diagnosticDialog.close());
document.getElementById('cancel-diagnostic').addEventListener('click', () => diagnosticDialog.close());
diagnosticForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const answers = new FormData(diagnosticForm);
  const score = Number(answers.get('q1') === 'having')
    + Number(answers.get('q2') === 'loc')
    + Number(answers.get('q3') === 'success');
  const readiness = Math.min(98, 60 + score * 13);
  localStorage.setItem('skillbridgeDiagnosticScore', String(score));
  diagnosticResult.textContent = `Baseline complete: ${score} of 3 correct. Your readiness score has been updated.`;
  diagnosticResult.classList.remove('hidden');
  readinessScore.textContent = `${readiness}%`;
  readinessScore.parentElement.parentElement.style.background =
    `conic-gradient(#BF39E8 0deg ${readiness * 3.6}deg,#F4DDFB ${readiness * 3.6}deg 360deg)`;
});
diagnosticDialog.addEventListener('click', (event) => {
  if (event.target === diagnosticDialog) diagnosticDialog.close();
});
