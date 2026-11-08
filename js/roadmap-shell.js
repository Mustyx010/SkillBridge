const fullName = window.SkillBridgeApi.session()?.user?.fullName || 'Candidate';
const givenName = fullName.trim().split(/\s+/)[0] || 'Candidate';
const familyName = fullName.trim().split(/\s+/).at(-1) || '';
document.getElementById('roadmap-user-name').textContent = `${givenName} ${familyName && familyName !== givenName ? `${familyName[0]}.` : ''}`;
document.title = 'Career Roadmap | SkillBridge';
document.querySelector('header span.ml-auto')?.remove();

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

const roadmapMain = document.querySelector('main[aria-label="Personalized career roadmap"]');
const roadmapApiPanel = document.createElement('section');
roadmapApiPanel.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';
roadmapApiPanel.setAttribute('aria-labelledby', 'api-roadmap-title');
roadmapApiPanel.setAttribute('aria-busy', 'true');
roadmapMain.replaceChildren(roadmapApiPanel);
const loadingTitle = document.createElement('h2');
loadingTitle.id = 'api-roadmap-title';
loadingTitle.className = 'text-lg font-bold';
loadingTitle.textContent = 'Loading your roadmap…';
roadmapApiPanel.append(loadingTitle);

const roadmapsFrom = (response) => {
  const data = window.SkillBridgeApi.unwrap(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return data?.id ? [data] : [];
};

const loadApiRoadmap = async () => {
  try {
    if (!window.SkillBridgeApi.session()) {
      roadmapApiPanel.replaceChildren();
      const title = document.createElement('h2');
      title.id = 'api-roadmap-title';
      title.className = 'text-lg font-bold';
      title.textContent = 'Sign in to view your roadmap';
      const link = document.createElement('a');
      link.href = 'signin.html';
      link.className = 'mt-3 inline-flex font-semibold text-[#731F94] underline';
      link.textContent = 'Sign in';
      roadmapApiPanel.append(title, link);
      roadmapApiPanel.setAttribute('aria-busy', 'false');
      return;
    }

    let roadmaps = roadmapsFrom(await window.SkillBridgeApi.get('/api/v1/roadmaps'));
    let skillGapId = localStorage.getItem('skillbridgeSkillGapId');
    let roadmap = skillGapId
      ? roadmaps.find((item) => item.skillGapId === skillGapId)
      : roadmaps[0];
    if (!roadmap) {
      if (!skillGapId) {
        const gaps = window.SkillBridgeApi.unwrap(await window.SkillBridgeApi.get('/api/v1/skill-gaps'));
        const gapList = Array.isArray(gaps) ? gaps : gaps?.items || [];
        skillGapId = gapList[0]?.id;
      }
      if (!skillGapId) {
        roadmapApiPanel.replaceChildren();
        const title = document.createElement('h2');
        title.id = 'api-roadmap-title';
        title.className = 'text-lg font-bold';
        title.textContent = 'No roadmap available yet';
        const message = document.createElement('p');
        message.className = 'mt-2 text-sm text-[#625B6D]';
        message.textContent = 'Analyze a CV to create a skill-gap analysis before generating your roadmap.';
        const link = document.createElement('a');
        link.href = 'cv-upload.html';
        link.className = 'mt-3 inline-flex font-semibold text-[#731F94] underline';
        link.textContent = 'Upload and analyze your CV';
        roadmapApiPanel.append(title, message, link);
        roadmapApiPanel.setAttribute('aria-busy', 'false');
        return;
      }
      localStorage.setItem('skillbridgeSkillGapId', skillGapId);
      await window.SkillBridgeApi.post('/api/v1/roadmaps/generate', { skillGapId });
      roadmaps = roadmapsFrom(await window.SkillBridgeApi.get('/api/v1/roadmaps'));
      roadmap = roadmaps.find((item) => item.skillGapId === skillGapId);
    }

    if (!roadmap?.id) throw new Error('The API did not return a roadmap ID.');
    const response = await window.SkillBridgeApi.get(`/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}`);
    const data = window.SkillBridgeApi.unwrap(response);
    const tasksByPhase = data?.tasksByPhase || {};
    const tasks = Array.isArray(data?.tasks)
      ? data.tasks
      : [30, 60, 90].flatMap((phase) => (tasksByPhase[String(phase)] || []).map((task) => ({ ...task, phase })));
    roadmapApiPanel.replaceChildren();
    const title = document.createElement('h2');
    title.id = 'api-roadmap-title';
    title.className = 'text-lg font-bold';
    title.textContent = data.title || roadmap.title || 'Your roadmap';
    const subtitle = document.createElement('p');
    subtitle.className = 'mt-1 text-sm text-[#625B6D]';
    subtitle.textContent = `${data.targetRole || roadmap.targetRole || 'Career goal'} • ${data.status || roadmap.status || 'status unavailable'}`;
    roadmapApiPanel.append(title, subtitle);
    document.title = `${title.textContent} | SkillBridge`;
    const summary = document.createElement('p');
    summary.className = 'mt-2 text-sm leading-6 text-[#625B6D]';
    summary.textContent = data.summary || roadmap.summary || '';
    roadmapApiPanel.append(summary);
    if (!tasks.length) {
      window.SkillBridgeApi.showStatus(
        roadmapApiPanel,
        'The API returned roadmap details but no task list. Task progress can appear here when the backend includes roadmap tasks in its response.',
      );
      roadmapApiPanel.setAttribute('aria-busy', 'false');
      return;
    }

    subtitle.textContent += ` • ${tasks.length} API tasks`;
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
        const stopLoading = window.SkillBridgeApi.setLoading(updateButton, 'Updating task…');
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
          stopLoading();
          updateButton.textContent = task.status === 'done' ? 'Reopen task' : 'Mark complete';
        }
      });
      item.append(phase, taskTitle, description, status, updateButton);
      taskList.append(item);
    });
    roadmapApiPanel.append(taskList);
    roadmapApiPanel.setAttribute('aria-busy', 'false');
  } catch (error) {
    roadmapApiPanel.setAttribute('aria-busy', 'false');
    window.SkillBridgeApi.showStatus(roadmapApiPanel, `Your roadmap could not be loaded: ${error.message}`, true);
  }
};

loadApiRoadmap();
