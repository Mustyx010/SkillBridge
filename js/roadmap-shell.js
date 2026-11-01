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
      ...savedCapstone,
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
    status.textContent = 'Project details saved locally. Mentor review is not connected in this preview.';
    roadmapNotice('Project details saved in this browser. No review request was sent.');
    return;
  }
  roadmapNotice(messages[action] || 'This roadmap action is ready.');
}));

const roadmapMain = document.querySelector('main[aria-label="Personalized career roadmap"]');
const roadmapApiPanel = document.createElement('section');
roadmapApiPanel.className = 'hidden rounded-2xl bg-white p-5 shadow-sm sm:p-6';
roadmapApiPanel.setAttribute('aria-labelledby', 'api-roadmap-title');
const staticWeekNav = roadmapMain.querySelector('[aria-label="Roadmap weeks"]');
const staticRoadmapContent = staticWeekNav?.nextElementSibling;
roadmapMain.firstElementChild?.after(roadmapApiPanel);

const roadmapsFrom = (response) => {
  const data = window.SkillBridgeApi.unwrap(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return data?.id ? [data] : [];
};

const loadApiRoadmap = async () => {
  try {
    let roadmaps = roadmapsFrom(await window.SkillBridgeApi.get('/api/v1/roadmaps'));
    if (!roadmaps.length) {
      let skillGapId = localStorage.getItem('skillbridgeSkillGapId');
      if (!skillGapId) {
        const gaps = window.SkillBridgeApi.unwrap(await window.SkillBridgeApi.get('/api/v1/skill-gaps'));
        const gapList = Array.isArray(gaps) ? gaps : gaps?.items || [];
        skillGapId = gapList[0]?.id;
      }
      if (!skillGapId) {
        window.SkillBridgeApi.showStatus(roadmapApiPanel, 'No API roadmap is available yet. Complete CV analysis to create a skill gap, then generate your roadmap.');
        roadmapApiPanel.classList.remove('hidden');
        return;
      }
      localStorage.setItem('skillbridgeSkillGapId', skillGapId);
      await window.SkillBridgeApi.post('/api/v1/roadmaps/generate', { skillGapId });
      roadmaps = roadmapsFrom(await window.SkillBridgeApi.get('/api/v1/roadmaps'));
    }

    const roadmap = roadmaps[0];
    if (!roadmap?.id) throw new Error('The API did not return a roadmap ID.');
    const response = await window.SkillBridgeApi.get(`/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}`);
    const data = window.SkillBridgeApi.unwrap(response);
    const tasksByPhase = data?.tasksByPhase || {};
    const tasks = [30, 60, 90].flatMap((phase) => (tasksByPhase[String(phase)] || []).map((task) => ({ ...task, phase })));
    if (!tasks.length) {
      window.SkillBridgeApi.showStatus(roadmapApiPanel, 'Your API roadmap has no tasks yet.');
      roadmapApiPanel.classList.remove('hidden');
      return;
    }

    roadmapApiPanel.replaceChildren();
    const title = document.createElement('h2');
    title.id = 'api-roadmap-title';
    title.className = 'text-lg font-bold';
    title.textContent = data.title || roadmap.title || 'Your generated roadmap';
    const subtitle = document.createElement('p');
    subtitle.className = 'mt-1 text-sm text-[#625B6D]';
    subtitle.textContent = `${tasks.length} tasks from your API roadmap. Mark tasks done to sync progress.`;
    const taskList = document.createElement('div');
    taskList.className = 'mt-4 grid gap-3 md:grid-cols-2';
    tasks.forEach((task) => {
      const item = document.createElement('article');
      item.className = 'rounded-xl bg-[#F8F4FF] p-4';
      const phase = document.createElement('p');
      phase.className = 'text-[10px] font-bold uppercase text-[#731F94]';
      phase.textContent = `Phase ${task.phase} days • ${task.taskType || 'task'}`;
      const taskTitle = document.createElement('h3');
      taskTitle.className = 'mt-1 text-sm font-semibold';
      taskTitle.textContent = task.title || 'Untitled task';
      const description = document.createElement('p');
      description.className = 'mt-1 text-xs leading-5 text-[#625B6D]';
      description.textContent = task.description || '';
      const status = document.createElement('p');
      status.className = 'mt-2 text-[10px] font-semibold text-[#625B6D]';
      status.textContent = `Status: ${task.status || 'todo'}`;
      const updateButton = document.createElement('button');
      updateButton.type = 'button';
      updateButton.className = 'mt-3 rounded-lg bg-[#731F94] px-3 py-2 text-xs font-semibold text-white';
      updateButton.textContent = task.status === 'done' ? 'Reopen task' : 'Mark complete';
      updateButton.addEventListener('click', async () => {
        updateButton.disabled = true;
        try {
          const nextStatus = task.status === 'done' ? 'todo' : 'done';
          await window.SkillBridgeApi.patch(
            `/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}/tasks/${encodeURIComponent(task.id)}`,
            { status: nextStatus },
          );
          task.status = nextStatus;
          status.textContent = `Status: ${nextStatus}`;
          updateButton.textContent = nextStatus === 'done' ? 'Reopen task' : 'Mark complete';
        } catch (error) {
          roadmapNotice(`Could not update task: ${error.message}`);
        } finally {
          updateButton.disabled = false;
        }
      });
      item.append(phase, taskTitle, description, status, updateButton);
      taskList.append(item);
    });
    roadmapApiPanel.append(title, subtitle, taskList);
    roadmapApiPanel.classList.remove('hidden');
    staticWeekNav?.classList.add('hidden');
    staticRoadmapContent?.classList.add('hidden');
  } catch (error) {
    roadmapApiPanel.classList.remove('hidden');
    window.SkillBridgeApi.showStatus(roadmapApiPanel, `Your roadmap could not be loaded: ${error.message}`, true);
  }
};

loadApiRoadmap();
