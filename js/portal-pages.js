const readList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

// Candidate dashboard: reflect locally saved onboarding data and provide
// working preview interactions for the benchmark tools shown on the page.
const dashboard = document.getElementById('dashboard-search-form');
if (dashboard && document.getElementById('welcome-name')) {
  const readObject = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  };
  const account = readObject('skillbridge_user');
  const survey = readObject('skillbridge_survey');
  const surveyData = survey.data || {};
  const fullName = surveyData.fullName || account.name || 'Amaka';
  const firstName = fullName.trim().split(/\s+/)[0] || 'Candidate';
  const lastName = fullName.trim().split(/\s+/).slice(-1)[0] || '';
  document.getElementById('welcome-name').textContent = `${firstName}!`;
  document.getElementById('dashboard-user-name').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`.trim();

  const trackNames = {
    'fintech-data': 'Junior Fintech Data Analyst',
    backend: 'Associate Backend Engineer',
    'growth-product': 'Growth Product Associate',
  };
  const trackName = trackNames[surveyData.track] || localStorage.getItem('skillbridgeSelectedCareer') || 'Junior Fintech Data Analyst';
  document.getElementById('target-track').textContent = trackName;
  document.getElementById('dashboard-user-track').textContent = trackName.replace(/Junior |Associate /, '');
  const salaryMin = Number(surveyData.payMin) || 250000;
  const salaryMax = Number(surveyData.payMax) || 350000;
  document.getElementById('target-salary').textContent = `₦${Math.round(salaryMin / 1000)}k–₦${Math.round(salaryMax / 1000)}k/mo target range`;
  const verifiedInstitution = surveyData.institution || '';
  if (verifiedInstitution) {
    const verificationBadge = document.getElementById('verification-badge');
    const icon = document.createElement('i');
    icon.className = 'ph ph-seal-check';
    icon.setAttribute('aria-hidden', 'true');
    verificationBadge.replaceChildren(icon, document.createTextNode(` ${verifiedInstitution} Verified`));
  } else {
    document.getElementById('verification-badge').textContent = 'Profile verification pending';
  }

  const sidebar = document.getElementById('dashboard-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarToggle = document.getElementById('dashboard-menu-button');
  const toggleSidebar = (open) => {
    sidebar.classList.toggle('-translate-x-full', !open);
    sidebarBackdrop.classList.toggle('hidden', !open);
    sidebarToggle.setAttribute('aria-expanded', String(open));
    sidebarToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  sidebarToggle.addEventListener('click', () => toggleSidebar(sidebarToggle.getAttribute('aria-expanded') !== 'true'));
  sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));
  sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) toggleSidebar(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleSidebar(false); });

  const searchForm = document.getElementById('dashboard-search-form');
  const searchInput = document.getElementById('dashboard-search');
  const results = document.getElementById('dashboard-search-results');
  const searchable = [
    ['Junior Fintech Data Analyst', 'SQL, fintech, analyst, Moniepoint'],
    ['Associate Analytics Engineer', 'Python, Pandas, data, Moniepoint'],
    ['Growth Analytics Associate', 'cohort, growth, analytics, PiggyVest'],
    ['60-Day Accelerated Roadmap', 'capstone, sprint, SQL'],
    ['Skill Gap Analysis', 'skills, benchmark, CV, profile'],
  ];
  const goToSearch = (query) => { window.location.href = `opportunities.html?q=${encodeURIComponent(query)}`; };
  const renderSuggestions = () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) { results.classList.add('hidden'); return; }
    const matches = searchable.filter(([title, terms]) => `${title} ${terms}`.toLowerCase().includes(query)).slice(0, 5);
    results.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'px-3 py-2 text-xs text-[#81798B]';
      empty.textContent = 'No matching roles or skills. Press Enter to search all opportunities.';
      results.append(empty);
    } else {
      matches.forEach(([title, terms]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[#F5F0FD]';
        const label = document.createElement('span'); label.className = 'text-xs font-semibold'; label.textContent = title;
        const hint = document.createElement('span'); hint.className = 'text-[10px] text-[#81798B]'; hint.textContent = terms;
        button.append(label, hint);
        button.addEventListener('click', () => {
          if (title.includes('Roadmap')) window.location.href = 'roadmap.html';
          else if (title.includes('Skill Gap')) window.location.href = 'skill-gap.html';
          else goToSearch(title);
        });
        results.append(button);
      });
    }
    results.classList.remove('hidden');
  };
  searchInput.addEventListener('input', renderSuggestions);
  searchForm.addEventListener('submit', (event) => { event.preventDefault(); if (searchInput.value.trim()) goToSearch(searchInput.value.trim()); });
  document.addEventListener('click', (event) => { if (!searchForm.contains(event.target)) results.classList.add('hidden'); });

  const infoDialog = document.getElementById('dashboard-message-dialog');
  const showMessage = (message, title = 'SkillBridge update') => {
    document.getElementById('dashboard-message-title').textContent = title;
    document.getElementById('dashboard-message').textContent = message;
    infoDialog.showModal();
  };
  document.querySelectorAll('[data-dashboard-message]').forEach((button) => button.addEventListener('click', () => showMessage(button.dataset.dashboardMessage)));
  document.querySelectorAll('[data-close-message]').forEach((button) => button.addEventListener('click', () => infoDialog.close()));
  infoDialog.addEventListener('click', (event) => { if (event.target === infoDialog) infoDialog.close(); });

  const updateDashboardSetup = () => {
    const setup = {
      profile: Boolean(survey.completed),
      cv: Boolean(localStorage.getItem('skillbridgeUploadedCvName')),
      roadmap: Boolean(localStorage.getItem('skillbridgeRoadmapActivated')),
      portfolio: Boolean(localStorage.getItem('skillbridgePortfolioConnected')),
    };
    const completed = Object.values(setup).filter(Boolean).length;
    document.getElementById('setup-count').textContent = `(${completed} of 4)`;
    document.getElementById('setup-percent').textContent = `${Math.round(completed / 4 * 100)}%`;
    document.getElementById('setup-progress').style.width = `${completed / 4 * 100}%`;
    document.querySelectorAll('.setup-item').forEach((item) => {
      const done = setup[item.dataset.setup];
      const icon = item.querySelector('.setup-icon');
      if (done) {
        icon.className = 'setup-icon ph ph-check-circle text-base text-[#731F94]';
        item.classList.add('text-[#81798B]'); item.classList.remove('bg-[#F6F0FF]', 'font-semibold', 'text-[#731F94]');
      } else {
        icon.className = 'setup-icon ph ph-circle text-base text-[#C8BED5]';
        item.classList.remove('text-[#81798B]');
      }
    });
    const cvPresent = setup.cv;
    const parsedCount = document.getElementById('parsed-count');
    parsedCount.textContent = cvPresent ? '14 parsed' : 'Awaiting CV';
    const extractedCards = document.getElementById('extracted-skill-cards');
    const validationCallout = document.getElementById('validate-skills-callout');
    extractedCards.classList.toggle('hidden', !cvPresent);
    validationCallout.classList.toggle('hidden', cvPresent);
    if (!cvPresent) {
      validationCallout.innerHTML = '<p class="text-[9px] text-[#4A4455]"><i class="ph ph-file-arrow-up text-[#731F94]"></i> Upload your CV to populate your extracted strengths, tools, and track gaps.</p><a href="cv-upload.html" class="shrink-0 text-[10px] font-bold text-[#731F94]">Upload CV <i class="ph ph-arrow-right"></i></a>';
    }
  };
  updateDashboardSetup();

  document.getElementById('notifications-button').addEventListener('click', () => showMessage('You’re all caught up. We’ll show interview and cohort updates here.', 'Notifications'));
  document.querySelectorAll('[data-coach-question]').forEach((button) => button.addEventListener('click', () => {
    const responses = {
      'skill-gaps': 'Your strongest base is econometrics and financial modeling. Focus your capstone on dbt and payment data to demonstrate those skills.',
      capstone: 'The accelerated capstone is planned across 60 days, with the first SQL sprint taking about 15 days at roughly 10 hours per week.',
      salary: 'Your selected entry-level fintech analyst target is ₦250k–₦350k gross per month. Compare current roles before setting a final expectation.',
    };
    document.getElementById('coach-message').textContent = responses[button.dataset.coachQuestion];
  }));

  const joinButton = document.getElementById('join-cohort');
  const renderJoinState = () => {
    const joined = localStorage.getItem('skillbridgeStudyCircleJoined') === 'true';
    joinButton.innerHTML = joined ? '<i class="ph ph-check-circle"></i><span>Joined Study Circle</span>' : '<i class="ph ph-users-three"></i><span>Join Study Circle</span>';
    joinButton.setAttribute('aria-pressed', String(joined));
  };
  joinButton.addEventListener('click', () => {
    const joined = localStorage.getItem('skillbridgeStudyCircleJoined') === 'true';
    localStorage.setItem('skillbridgeStudyCircleJoined', String(!joined));
    renderJoinState();
    showMessage(!joined ? 'You joined the Lekki-Yaba Analyst Cohort. Cohort invites are shown here in the prototype.' : 'You left the study circle.', 'Study Circle');
  });
  renderJoinState();

  document.querySelectorAll('.role-apply').forEach((button) => button.addEventListener('click', () => {
    showMessage(`The ${button.dataset.role} preview is ready. Recruiter applications are not connected in this prototype.`, 'Opportunity preview');
  }));

  document.querySelectorAll('a[href="roadmap.html"]').forEach((link) => link.addEventListener('click', () => localStorage.setItem('skillbridgeRoadmapActivated', 'true')));
}

// Candidate dashboard: remember completed priorities and the selected track.
const selectedCareerLabel = document.getElementById('selected-career');
if (selectedCareerLabel) {
  selectedCareerLabel.textContent = localStorage.getItem('skillbridgeSelectedCareer') || 'Choose a pathway to personalize your dashboard';
  const gapChecks = [...document.querySelectorAll('.gap-check')];
  const completedGaps = new Set(readList('skillbridgeGapPriorities'));
  const updateGapProgress = () => {
    localStorage.setItem('skillbridgeGapPriorities', JSON.stringify(gapChecks.filter((item) => item.checked).map((item) => item.dataset.gap)));
    const total = gapChecks.filter((item) => item.checked).length;
    document.getElementById('gap-progress-text').textContent = `${total} of ${gapChecks.length} priorities complete`;
  };
  gapChecks.forEach((item) => {
    item.checked = completedGaps.has(item.dataset.gap);
    item.addEventListener('change', updateGapProgress);
  });
  updateGapProgress();
}

// Roadmap: keep milestone completion between visits and calculate progress.
const roadmapChecks = [...document.querySelectorAll('.roadmap-check')];
if (roadmapChecks.length) {
  const completeTasks = new Set(readList('skillbridgeRoadmapTasks'));
  const progressLabel = document.getElementById('roadmap-progress-label');
  const progressPercent = document.getElementById('roadmap-progress-percent');
  const progressBar = document.getElementById('roadmap-progress-bar');
  const updateRoadmap = () => {
    const complete = roadmapChecks.filter((item) => item.checked).map((item) => item.dataset.task);
    localStorage.setItem('skillbridgeRoadmapTasks', JSON.stringify(complete));
    const percent = Math.round((complete.length / roadmapChecks.length) * 100);
    progressLabel.textContent = `${complete.length} of ${roadmapChecks.length} milestones complete`;
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
  };
  roadmapChecks.forEach((item) => {
    item.checked = completeTasks.has(item.dataset.task);
    item.addEventListener('change', updateRoadmap);
  });
  document.getElementById('reset-roadmap').addEventListener('click', () => {
    roadmapChecks.forEach((item) => { item.checked = false; });
    updateRoadmap();
  });
  updateRoadmap();
}

// Opportunities: filter by role text/location and persist saved openings.
const opportunityForm = document.getElementById('opportunity-filters');
if (opportunityForm && !document.getElementById('opportunity-list')) {
  const cards = [...document.querySelectorAll('.opportunity-card')];
  const search = document.getElementById('opportunity-search');
  const location = document.getElementById('location-filter');
  const status = document.getElementById('opportunity-status');
  const savedRoles = new Set(readList('skillbridgeSavedRoles'));
  const savedCount = document.getElementById('saved-count');
  const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
  search.value = initialQuery;
  const updateSaved = () => {
    localStorage.setItem('skillbridgeSavedRoles', JSON.stringify([...savedRoles]));
    savedCount.textContent = savedRoles.size;
    document.querySelectorAll('.save-opportunity').forEach((button) => {
      const role = button.closest('.opportunity-card').dataset.role;
      const saved = savedRoles.has(role);
      button.textContent = saved ? 'Saved' : 'Save role';
      button.setAttribute('aria-pressed', String(saved));
      button.classList.toggle('bg-[#731F94]', saved);
      button.classList.toggle('text-white', saved);
    });
  };
  const filterRoles = () => {
    const query = search.value.trim().toLowerCase();
    const place = location.value;
    let shown = 0;
    cards.forEach((card) => {
      const matchesText = `${card.dataset.role} ${card.dataset.company} ${card.dataset.eligibility || ''} ${card.textContent}`.toLowerCase().includes(query);
      const matchesLocation = place === 'all' || card.dataset.location === place || (place === 'nysc' && card.dataset.eligibility === 'nysc') || (place === 'flexible' && ['hybrid', 'remote'].includes(card.dataset.location));
      card.hidden = !(matchesText && matchesLocation);
      if (!card.hidden) shown += 1;
    });
    document.getElementById('opportunity-count').textContent = shown;
    status.textContent = shown ? `Showing ${shown} matched ${shown === 1 ? 'role' : 'roles'}.` : 'No roles match those filters. Try another title or location.';
  };
  cards.forEach((card) => {
    const button = card.querySelector('.save-opportunity');
    if (!button) return;
    button.addEventListener('click', () => {
      const role = card.dataset.role;
      if (savedRoles.has(role)) savedRoles.delete(role);
      else savedRoles.add(role);
      updateSaved();
    });
  });
  opportunityForm.addEventListener('submit', (event) => { event.preventDefault(); filterRoles(); });
  search.addEventListener('input', filterRoles);
  location.addEventListener('change', filterRoles);
  updateSaved();
  filterRoles();
}

// Development resources: filter topics and remember completed lessons.
const resourceList = document.getElementById('resource-list');
if (resourceList) {
  const resources = [...resourceList.querySelectorAll('.learning-resource')];
  const completed = new Set(readList('skillbridgeCompletedResources'));
  const status = document.getElementById('resource-status');
  const search = document.getElementById('resource-search');
  let activeFilter = 'all';
  const apiSection = document.createElement('section');
  apiSection.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';
  apiSection.setAttribute('aria-labelledby', 'api-recommendations-title');
  const apiTitle = document.createElement('h2');
  apiTitle.id = 'api-recommendations-title';
  apiTitle.className = 'text-lg font-bold text-[#731F94]';
  apiTitle.textContent = 'Recommended learning from your profile';
  const apiStatus = document.createElement('p');
  apiStatus.className = 'mt-2 text-xs text-[#625B6D]';
  apiStatus.setAttribute('role', 'status');
  const apiCards = document.createElement('div');
  apiCards.className = 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3';
  apiSection.append(apiTitle, apiStatus, apiCards);
  status?.after(apiSection);
  let apiRecommendationCards = [];
  let progressByRecommendation = new Map();

  const filterResources = () => {
    const query = search?.value.trim().toLowerCase() || '';
    let visibleCount = 0;
    resources.forEach((resource) => {
      const matchesCategory = activeFilter === 'all' || resource.dataset.category === activeFilter;
      const matchesQuery = !query || resource.textContent.toLowerCase().includes(query);
      resource.hidden = !matchesCategory || !matchesQuery;
      if (!resource.hidden) visibleCount += 1;
    });
    apiRecommendationCards.forEach((card) => {
      const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !matchesCategory || !matchesQuery;
      if (!card.hidden) visibleCount += 1;
    });
    if (status && query && visibleCount === 0) status.textContent = 'No learning opportunities match your search.';
    else if (status && query) status.textContent = `${visibleCount} ${visibleCount === 1 ? 'opportunity' : 'opportunities'} found.`;
    else if (status) status.textContent = completed.size ? `${completed.size} learning ${completed.size === 1 ? 'resource' : 'resources'} marked complete.` : '';
  };
  const updateResourceButtons = () => {
    document.querySelectorAll('.resource-complete').forEach((button) => {
      const done = completed.has(button.dataset.resource);
      button.textContent = done ? 'Completed ✓' : 'Mark complete';
      button.setAttribute('aria-pressed', String(done));
    });
  };
  document.querySelectorAll('.resource-filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.resourceFilter || 'all';
      document.querySelectorAll('.resource-filter').forEach((item) => {
        const active = item === button;
        item.setAttribute('aria-pressed', String(active));
        item.classList.toggle('bg-[#731F94]', active);
        item.classList.toggle('text-white', active);
        item.classList.toggle('bg-white', !active);
      });
      filterResources();
    });
  });
  search?.addEventListener('input', filterResources);
  document.getElementById('development-search-form')?.addEventListener('submit', (event) => event.preventDefault());
  document.querySelectorAll('.resource-complete').forEach((button) => {
    button.addEventListener('click', () => {
      if (completed.has(button.dataset.resource)) completed.delete(button.dataset.resource);
      else completed.add(button.dataset.resource);
      localStorage.setItem('skillbridgeCompletedResources', JSON.stringify([...completed]));
      updateResourceButtons();
      if (status && !search?.value.trim()) status.textContent = `${completed.size} learning ${completed.size === 1 ? 'resource' : 'resources'} marked complete.`;
    });
  });
  updateResourceButtons();
  filterResources();

  const renderApiRecommendations = (recommendations) => {
    apiCards.replaceChildren();
    apiRecommendationCards = [];
    recommendations.forEach((recommendation) => {
      const categoryText = `${recommendation.skill?.category || ''} ${recommendation.skill?.name || ''}`.toLowerCase();
      const category = categoryText.includes('backend') || categoryText.includes('engineering')
        ? 'backend'
        : categoryText.includes('product') || categoryText.includes('growth')
          ? 'product'
          : 'data';
      const card = document.createElement('article');
      card.className = 'api-recommendation rounded-xl bg-[#F8F4FF] p-4';
      card.dataset.category = category;
      const type = document.createElement('p');
      type.className = 'text-[10px] font-bold uppercase tracking-wide text-[#731F94]';
      type.textContent = `${recommendation.type === 'project' ? 'Project' : 'Learning resource'}${recommendation.difficulty ? ` • ${recommendation.difficulty}` : ''}`;
      const title = document.createElement('h3');
      title.className = 'mt-2 text-sm font-bold';
      title.textContent = recommendation.title || 'Recommended resource';
      const description = document.createElement('p');
      description.className = 'mt-1 text-xs leading-5 text-[#625B6D]';
      description.textContent = recommendation.description || '';
      const actions = document.createElement('div');
      actions.className = 'mt-3 flex flex-wrap items-center gap-2';
      if (recommendation.url) {
        try {
          const resourceUrl = new URL(recommendation.url);
          if (['http:', 'https:'].includes(resourceUrl.protocol)) {
            const link = document.createElement('a');
            link.className = 'rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#731F94]';
            link.href = resourceUrl.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Open resource';
            actions.append(link);
          }
        } catch {
          apiStatus.textContent = 'One recommended resource has an invalid URL and was not linked.';
        }
      }
      const progressButton = document.createElement('button');
      progressButton.type = 'button';
      progressButton.className = 'rounded-lg bg-[#731F94] px-3 py-2 text-xs font-semibold text-white';
      actions.append(progressButton);
      card.append(type, title, description, actions);
      apiCards.append(card);
      apiRecommendationCards.push(card);

      const updateProgressButton = () => {
        const progress = progressByRecommendation.get(recommendation.id);
        progressButton.textContent = !progress
          ? 'Start learning'
          : progress.status === 'completed'
            ? 'Reopen learning'
            : 'Mark complete';
      };
      progressButton.addEventListener('click', async () => {
        progressButton.disabled = true;
        try {
          const progress = progressByRecommendation.get(recommendation.id);
          let response;
          if (!progress) {
            response = await window.SkillBridgeApi.post('/api/v1/progress', { recommendationId: recommendation.id });
          } else {
            const completed = progress.status !== 'completed';
            response = await window.SkillBridgeApi.patch(`/api/v1/progress/${encodeURIComponent(progress.id)}`, {
              status: completed ? 'completed' : 'in_progress',
              progressPercentage: completed ? 100 : 0,
            });
          }
          const record = window.SkillBridgeApi.unwrap(response);
          const nextProgress = record?.id ? record : record?.progress || record;
          if (!nextProgress?.id) throw new Error('The API did not return a progress record.');
          progressByRecommendation.set(recommendation.id, nextProgress);
          updateProgressButton();
          const completedCount = [...progressByRecommendation.values()].filter((item) => item.status === 'completed').length;
          const count = document.getElementById('completed-module-count');
          if (count) count.textContent = `${completedCount} of ${progressByRecommendation.size} recommendations`;
          apiStatus.textContent = 'Learning progress saved to your account.';
        } catch (error) {
          apiStatus.textContent = `Progress could not be saved: ${error.message}`;
        } finally {
          progressButton.disabled = false;
        }
      });
      updateProgressButton();
    });
    filterResources();
  };

  const loadApiRecommendations = async () => {
    if (!window.SkillBridgeApi.session()) {
      apiStatus.textContent = 'Sign in to load personalized recommendations and sync learning progress.';
      return;
    }
    apiStatus.textContent = 'Loading recommendations…';
    const [recommendationsResult, progressResult] = await Promise.allSettled([
      window.SkillBridgeApi.get('/api/v1/recommendations/personalized'),
      window.SkillBridgeApi.get('/api/v1/progress'),
    ]);
    if (recommendationsResult.status === 'rejected') {
      apiStatus.textContent = `Recommendations could not be loaded: ${recommendationsResult.reason.message}`;
      return;
    }
    const recommendations = window.SkillBridgeApi.unwrap(recommendationsResult.value);
    if (!Array.isArray(recommendations)) {
      apiStatus.textContent = 'The API returned an invalid recommendations list.';
      return;
    }
    if (progressResult.status === 'fulfilled') {
      const records = window.SkillBridgeApi.unwrap(progressResult.value);
      progressByRecommendation = new Map((Array.isArray(records) ? records : []).map((record) => [record.recommendationId, record]));
    } else {
      apiStatus.textContent = `Recommendations loaded, but progress could not be fetched: ${progressResult.reason.message}`;
    }
    renderApiRecommendations(recommendations);
    if (progressResult.status === 'fulfilled') apiStatus.textContent = `${recommendations.length} personalized recommendations loaded.`;
    const completedCount = [...progressByRecommendation.values()].filter((item) => item.status === 'completed').length;
    const count = document.getElementById('completed-module-count');
    if (count && progressByRecommendation.size) count.textContent = `${completedCount} of ${progressByRecommendation.size} recommendations`;
  };
  loadApiRecommendations();
}

const sharedSidebar = document.getElementById('dashboard-sidebar');
if (sharedSidebar && !document.getElementById('welcome-name')) {
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarToggle = document.getElementById('dashboard-menu-button');
  if (sidebarBackdrop && sidebarToggle) {
    const toggleSidebar = (open) => {
      sharedSidebar.classList.toggle('-translate-x-full', !open);
      sidebarBackdrop.classList.toggle('hidden', !open);
      sidebarToggle.setAttribute('aria-expanded', String(open));
      sidebarToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    sidebarToggle.addEventListener('click', () => toggleSidebar(sidebarToggle.getAttribute('aria-expanded') !== 'true'));
    sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));
    sharedSidebar.addEventListener('click', (event) => { if (event.target.closest('a')) toggleSidebar(false); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleSidebar(false); });
  }
  const account = (() => {
    try { return JSON.parse(localStorage.getItem('skillbridge_user') || '{}'); }
    catch { return {}; }
  })();
  const survey = (() => {
    try { return JSON.parse(localStorage.getItem('skillbridge_survey') || '{}'); }
    catch { return {}; }
  })();
  const fullName = survey?.data?.fullName || account?.name || 'Candidate';
  const nameParts = fullName.trim().split(/\s+/);
  const trackName = document.getElementById('track-user-name') || document.getElementById('topbar-user-name');
  if (trackName) trackName.textContent = `${nameParts[0]} ${nameParts.length > 1 ? `${nameParts[nameParts.length - 1][0]}.` : ''}`.trim();
}

const capstoneFilter = document.getElementById('capstone-filter');
if (capstoneFilter) {
  const projects = [...document.querySelectorAll('.capstone-project')];
  const emptyState = document.getElementById('capstone-empty');
  capstoneFilter.addEventListener('change', () => {
    let visible = 0;
    projects.forEach((project) => {
      project.hidden = capstoneFilter.value !== 'all' && project.dataset.track !== capstoneFilter.value;
      if (!project.hidden) visible += 1;
    });
    emptyState.classList.toggle('hidden', visible > 0);
  });
}

const sandboxRunButton = document.getElementById('run-sandbox-query');
if (sandboxRunButton) {
  sandboxRunButton.addEventListener('click', () => {
    const results = document.getElementById('sandbox-result');
    results.replaceChildren();
    const notice = document.createElement('p');
    notice.className = 'mb-3 text-[10px] font-semibold text-[#81798B]';
    notice.textContent = 'Preview rows only — this prototype does not execute SQL.';
    const table = document.createElement('table');
    table.className = 'w-full text-left text-[10px]';
    table.innerHTML = '<thead class="text-[#81798B]"><tr><th class="px-2 py-1">route_id</th><th class="px-2 py-1">trips</th></tr></thead><tbody><tr class="border-t border-[#EEE7F7]"><td class="px-2 py-2">BRT-03</td><td class="px-2 py-2">12,480</td></tr><tr class="border-t border-[#EEE7F7]"><td class="px-2 py-2">BRT-01</td><td class="px-2 py-2">10,216</td></tr><tr class="border-t border-[#EEE7F7]"><td class="px-2 py-2">BRT-07</td><td class="px-2 py-2">8,904</td></tr></tbody>';
    results.append(notice, table);
    results.classList.remove('hidden');
  });
}
