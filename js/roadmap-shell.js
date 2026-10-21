const readProfile = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
};
const user = readProfile('skillbridge_user');
const survey = readProfile('skillbridge_survey');
const fullName = survey.data?.fullName || user.name || 'Amaka Okafor';
const givenName = fullName.trim().split(/\s+/)[0] || 'Candidate';
const familyName = fullName.trim().split(/\s+/).at(-1) || '';
document.getElementById('roadmap-user-name').textContent = `${givenName} ${familyName ? `${familyName[0]}.` : ''}`;

const sidebar = document.getElementById('roadmap-sidebar');
const backdrop = document.getElementById('roadmap-backdrop');
const menuButton = document.getElementById('roadmap-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
menuButton.addEventListener('click', () => setSidebarOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) setSidebarOpen(false); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setSidebarOpen(false); });

const searchForm = document.getElementById('roadmap-search-form');
const searchInput = document.getElementById('roadmap-search');
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (query) window.location.href = `opportunities.html?q=${encodeURIComponent(query)}`;
});

document.getElementById('roadmap-notifications').addEventListener('click', () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'w-[min(92vw,420px)] rounded-2xl border-0 p-6 text-[#181445] shadow-2xl backdrop:bg-[#181445]/40';
  dialog.innerHTML = '<div class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-bold">Notifications</h2><p class="mt-2 text-sm leading-6 text-[#625B6D]">You’re all caught up. Sprint and mentor updates will appear here.</p></div><button type="button" class="text-xl" aria-label="Close">×</button></div>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => { dialog.close(); dialog.remove(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { dialog.close(); dialog.remove(); } });
  dialog.showModal();
});

const roadmapNotice = (message) => {
  let notice = document.getElementById('roadmap-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'roadmap-notice';
    notice.className = 'fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#181445] px-4 py-3 text-sm font-semibold text-white shadow-xl';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    document.body.append(notice);
  }
  notice.textContent = message;
  notice.classList.remove('hidden');
  clearTimeout(roadmapNotice.timeout);
  roadmapNotice.timeout = setTimeout(() => notice.classList.add('hidden'), 3200);
};

const savedCapstone = (() => {
  try { return JSON.parse(localStorage.getItem('skillbridge_capstone') || '{}'); }
  catch { return {}; }
})();
for (const [id, value] of [['roadmap-repo-url', savedCapstone.repo], ['roadmap-dataset-url', savedCapstone.dataset], ['roadmap-project-notes', savedCapstone.notes]]) {
  if (value) document.getElementById(id).value = value;
}
for (const id of ['roadmap-repo-url', 'roadmap-dataset-url', 'roadmap-project-notes']) {
  document.getElementById(id).addEventListener('input', () => {
    const capstone = {
      repo: document.getElementById('roadmap-repo-url').value,
      dataset: document.getElementById('roadmap-dataset-url').value,
      notes: document.getElementById('roadmap-project-notes').value,
    };
    localStorage.setItem('skillbridge_capstone', JSON.stringify(capstone));
  });
}

document.querySelectorAll('[data-roadmap-week]').forEach((button) => button.addEventListener('click', () => {
  const week = Number(button.dataset.roadmapWeek);
  if (week > 2) {
    roadmapNotice(`Week ${String(week).padStart(2, '0')} unlocks after you complete the active sprint.`);
    return;
  }
  if (week === 1) {
    roadmapNotice('Week 01 is complete. Review your relational foundations modules from the dashboard.');
    return;
  }
  roadmapNotice('You are viewing the active Week 02 sprint.');
}));

document.querySelectorAll('[data-roadmap-action]').forEach((button) => button.addEventListener('click', () => {
  const action = button.dataset.roadmapAction;
  const messages = {
    review: 'Completed module review is ready in your learning history.',
    resume: 'Opening the SQL window functions sandbox…',
    sandbox: 'PostgreSQL sandbox is ready for your Week 02 practice.',
    'cheat-sheet': 'The SQL cheat sheet is being prepared for download.',
    'data-docs': 'Dataset schema: transaction_id, terminal_id, tap_time, fare_amount, and route_id.',
    'milestone-info': 'Analyze anonymized Cowry validator taps and submit your query and findings for review.',
    rubric: 'Rubric: data cleaning 25%, SQL analysis 35%, anomaly detection 25%, clear notes 15%.',
    'preview-certificate': 'Your verified certificate unlocks after completing Week 04.',
    'verify-linkedin': 'LinkedIn verification becomes available when your certificate is issued.',
    'mentor-rsvp': 'Mentor Q&A RSVP saved. The session is tomorrow at 4:00 PM WAT.',
  };
  if (action === 'submit-review') {
    const repo = document.getElementById('roadmap-repo-url').value.trim();
    const dataset = document.getElementById('roadmap-dataset-url').value.trim();
    const notes = document.getElementById('roadmap-project-notes').value.trim();
    const status = document.getElementById('roadmap-capstone-status');
    if (!repo || !dataset || !notes) {
      status.textContent = 'Add your repository, dataset link, and analysis notes before submitting.';
      roadmapNotice('Complete all three capstone fields before requesting review.');
      return;
    }
    status.textContent = 'Capstone submitted. Mentor AI review is queued.';
    roadmapNotice('Capstone submitted for mentor AI review.');
    return;
  }
  roadmapNotice(messages[action] || 'This roadmap action is ready.');
}));
