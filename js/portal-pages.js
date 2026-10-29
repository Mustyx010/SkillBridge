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
    document.getElementById('verification-badge').innerHTML = `<i class="ph ph-seal-check"></i> ${verifiedInstitution} Verified`;
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
    ['Extracted Skills & Parser Log', 'skills, CV, profile'],
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
          else if (title.includes('Skills')) window.location.href = 'profile-review.html';
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

  const diagnosticDialog = document.getElementById('diagnostic-dialog');
  const openDiagnostic = () => diagnosticDialog.showModal();
  document.querySelectorAll('#open-diagnostic, [data-open-diagnostic]').forEach((button) => button.addEventListener('click', openDiagnostic));
  if (window.location.hash === '#diagnostic') openDiagnostic();
  document.getElementById('close-diagnostic').addEventListener('click', () => diagnosticDialog.close());
  document.getElementById('cancel-diagnostic').addEventListener('click', () => diagnosticDialog.close());
  const diagnosticForm = document.getElementById('diagnostic-form');
  const diagnosticResult = document.getElementById('diagnostic-result');
  const updateDashboardSetup = () => {
    const setup = {
      profile: Boolean(survey.completed),
      cv: Boolean(localStorage.getItem('skillbridgeUploadedCvName')),
      diagnostic: localStorage.getItem('skillbridgeDiagnosticScore') !== null,
      roadmap: Boolean(localStorage.getItem('skillbridgeRoadmapActivated')),
      portfolio: Boolean(localStorage.getItem('skillbridgePortfolioConnected')),
    };
    const completed = Object.values(setup).filter(Boolean).length;
    document.getElementById('setup-count').textContent = `(${completed} of 5)`;
    document.getElementById('setup-percent').textContent = `${Math.round(completed / 5 * 100)}%`;
    document.getElementById('setup-progress').style.width = `${completed / 5 * 100}%`;
    document.querySelectorAll('.setup-item').forEach((item) => {
      const done = setup[item.dataset.setup];
      const icon = item.querySelector('.setup-icon');
      if (done) {
        icon.className = 'setup-icon ph ph-check-circle text-base text-[#731F94]';
        item.classList.add('text-[#81798B]'); item.classList.remove('bg-[#F6F0FF]', 'font-semibold', 'text-[#731F94]');
      } else {
        icon.className = `setup-icon ph ${item.dataset.setup === 'diagnostic' ? 'ph-circle' : 'ph-circle'} text-base text-[#C8BED5]`;
        item.classList.remove('text-[#81798B]');
      }
    });
    const cvPresent = setup.cv;
    const parsedCount = document.getElementById('parsed-count');
    parsedCount.textContent = cvPresent ? '14 parsed' : 'Awaiting CV';
    const extractedCards = document.getElementById('extracted-skill-cards');
    const validationCallout = document.getElementById('validate-skills-callout');
    extractedCards.classList.toggle('hidden', !cvPresent);
    if (!cvPresent) {
      validationCallout.innerHTML = '<p class="text-[9px] text-[#4A4455]"><i class="ph ph-file-arrow-up text-[#731F94]"></i> Upload your CV to populate your extracted strengths, tools, and track gaps.</p><a href="cv-upload.html" class="shrink-0 text-[10px] font-bold text-[#731F94]">Upload CV <i class="ph ph-arrow-right"></i></a>';
    }
    if (setup.diagnostic) {
      document.querySelector('[data-setup="diagnostic"] button').textContent = 'Diagnostic completed';
      document.querySelector('[data-setup="diagnostic"] span:last-child').textContent = 'Done';
      document.getElementById('test-score-hint').textContent = 'Diagnostic score saved';
      document.getElementById('badge-number').textContent = '3';
      document.getElementById('badge-count').textContent = '3 / 6 Earned';
      updateReadinessGauge(Math.min(98, 60 + Number(localStorage.getItem('skillbridgeDiagnosticScore')) * 13));
      document.querySelectorAll('.role-apply').forEach((button) => {
        button.innerHTML = '<i class="ph ph-arrow-up-right"></i> View opportunity';
        button.classList.remove('bg-[#EEE8FF]', 'text-[#81798B]');
        button.classList.add('bg-[#731F94]', 'text-white');
      });
    }
  };
  const updateReadinessGauge = (percent) => {
    document.getElementById('readiness-score').textContent = `${percent}%`;
    const gauge = document.getElementById('readiness-score').parentElement.parentElement;
    const angle = percent * 3.6;
    gauge.style.background = `conic-gradient(#BF39E8 0deg ${angle}deg,#FAE8FF ${angle}deg 360deg)`;
  };
  diagnosticForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = new FormData(diagnosticForm);
    const score = Number(answers.get('q1') === 'having') + Number(answers.get('q2') === 'loc') + Number(answers.get('q3') === 'success');
    localStorage.setItem('skillbridgeDiagnosticScore', String(score));
    diagnosticResult.textContent = `Baseline complete: ${score} of 3 answers correct. Your verified benchmark is now reflected on the dashboard.`;
    diagnosticResult.classList.remove('hidden');
    updateDashboardSetup();
    updateReadinessGauge(Math.min(98, 60 + score * 13));
  });
  diagnosticDialog.addEventListener('click', (event) => { if (event.target === diagnosticDialog) diagnosticDialog.close(); });
  updateDashboardSetup();

  document.getElementById('notifications-button').addEventListener('click', () => showMessage('You’re all caught up. We’ll show interview, cohort, and assessment updates here.', 'Notifications'));
  document.querySelectorAll('[data-coach-question]').forEach((button) => button.addEventListener('click', () => {
    const responses = {
      'skill-gaps': 'Your strongest base is econometrics and financial modeling. Validate SQL and Python with the diagnostic, then focus your capstone on dbt and payment data.',
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
    if (localStorage.getItem('skillbridgeDiagnosticScore') === null) {
      showMessage('Complete the skill diagnostic first to validate your profile before applying.', 'Applications locked');
      return;
    }
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
if (opportunityForm) {
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
  const updateResourceButtons = () => {
    document.querySelectorAll('.resource-complete').forEach((button) => {
      const done = completed.has(button.dataset.resource);
      button.textContent = done ? 'Completed ✓' : 'Mark complete';
      button.setAttribute('aria-pressed', String(done));
    });
  };
  document.querySelectorAll('.resource-filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.resource-filter').forEach((item) => {
        const active = item === button;
        item.setAttribute('aria-pressed', String(active));
        item.classList.toggle('bg-[#731F94]', active);
        item.classList.toggle('text-white', active);
        item.classList.toggle('bg-white', !active);
      });
      resources.forEach((resource) => { resource.hidden = button.dataset.resourceFilter !== 'all' && resource.dataset.category !== button.dataset.resourceFilter; });
    });
  });
  document.querySelectorAll('.resource-complete').forEach((button) => {
    button.addEventListener('click', () => {
      if (completed.has(button.dataset.resource)) completed.delete(button.dataset.resource);
      else completed.add(button.dataset.resource);
      localStorage.setItem('skillbridgeCompletedResources', JSON.stringify([...completed]));
      updateResourceButtons();
      status.textContent = `${completed.size} learning ${completed.size === 1 ? 'resource' : 'resources'} marked complete.`;
    });
  });
  updateResourceButtons();
}
