const readStoredObject = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

const activeSession = window.SkillBridgeApi.session();
const user = activeSession?.user || {};
const survey = activeSession ? readStoredObject('skillbridge_survey') : {};
const surveyData = survey.data || {};
const fullName = user.fullName || user.name || surveyData.fullName || 'Candidate';
const firstName = fullName.trim().split(/\s+/)[0] || 'Candidate';
document.querySelectorAll('[data-candidate-name]').forEach((element) => { element.textContent = firstName; });
const lastName = fullName.trim().split(/\s+/).at(-1) || '';
document.getElementById('topbar-user-name').textContent = `${firstName} ${lastName ? `${lastName[0]}.` : ''}`;

const trackLabels = {
  'fintech-data': 'Financial Technology & Data',
  backend: 'Backend Engineer',
  'growth-product': 'Growth Product',
};
const track = trackLabels[surveyData.track] || surveyData.track || 'Career goal not set';
document.querySelectorAll('[data-track-name]').forEach((element) => { element.textContent = track; });
document.getElementById('topbar-user-track').textContent = track === 'Career goal not set' ? track : `${track} Candidate`;
const profileLocation = document.getElementById('dashboard-profile-location');
if (profileLocation) profileLocation.textContent = '';

const sidebar = document.getElementById('dashboard-sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebarToggle = document.getElementById('dashboard-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  sidebarBackdrop.classList.toggle('hidden', !open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
  sidebarToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
sidebarToggle.addEventListener('click', () => setSidebarOpen(sidebarToggle.getAttribute('aria-expanded') !== 'true'));
sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) setSidebarOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebarOpen(false);
});

const dialog = document.getElementById('dashboard-action-dialog');
const title = document.getElementById('action-dialog-title');
const copy = document.getElementById('action-dialog-copy');
const dialogLink = document.getElementById('action-dialog-link');
const openDialog = (heading, message, linkText = '', linkHref = '') => {
  title.textContent = heading;
  copy.textContent = message;
  dialogLink.classList.toggle('hidden', !linkText);
  if (linkText) {
    dialogLink.textContent = linkText;
    dialogLink.href = linkHref;
  }
  dialog.showModal();
};

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => dialog.close());
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

const actionContent = {
  diagnostic: ['Your Skill Gap Analysis', 'Review the latest skill-gap analysis saved to your account, including current skills and areas to develop.', 'Review Skill Gaps', 'skill-gap.html'],
};
document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
  button.addEventListener('click', () => openDialog(...actionContent[button.dataset.dashboardAction]));
});

const searchForm = document.getElementById('dashboard-search-form');
const searchInput = document.getElementById('dashboard-search');
searchForm.addEventListener('submit', (event) => event.preventDefault());
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    jobCards.forEach((card) => card.classList.remove('hidden'));
    emptyState.classList.add('hidden');
    return;
  }
  let visibleCount = 0;
  jobCards.forEach((card) => {
    const visible = card.textContent.toLowerCase().includes(query);
    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount += 1;
  });
  emptyState.textContent = 'No matching job cards. Try another role, skill, or company.';
  emptyState.classList.toggle('hidden', visibleCount > 0);
});

document.querySelectorAll('[data-quick-view]').forEach((button) => {
  button.addEventListener('click', () => openDialog('Opportunity details', `${button.dataset.quickView}.`, 'Browse opportunities', 'opportunities.html'));
});

const insightCopy = {};
document.querySelectorAll('[data-why]').forEach((button) => {
  button.addEventListener('click', () => openDialog(`${button.dataset.why} match insight`, insightCopy[button.dataset.why]));
});

const stipendFilter = document.getElementById('stipend-filter');
let jobCards = [...document.querySelectorAll('.job-card')];
const emptyState = document.getElementById('filter-empty');
const dashboardJobList = jobCards[0]?.parentElement;
jobCards = [];
dashboardJobList?.replaceChildren();
const dashboardJobSection = document.querySelector('[aria-labelledby="matches-title"]');
if (dashboardJobSection) dashboardJobSection.hidden = true;
emptyState.textContent = 'Loading opportunities from your account…';
emptyState.classList.remove('hidden');
stipendFilter.closest('label')?.classList.add('hidden');

const dashboardApiStatus = document.createElement('p');
dashboardApiStatus.className = 'text-xs text-[#625B6D]';
dashboardApiStatus.setAttribute('role', 'status');
document.querySelector('main > section')?.after(dashboardApiStatus);

const listFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};
const latestFirst = (items) => [...items].sort((a, b) =>
  Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
const makeText = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
};

const renderMetricLink = (href, label, value, detail, icon) => {
  const link = document.querySelector(`main > section a[href="${href}"]`);
  if (!link) return;
  const labelRow = document.createElement('div');
  labelRow.className = 'flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-[#81798B]';
  labelRow.append(makeText('span', '', label));
  const iconElement = document.createElement('i');
  iconElement.className = `ph ${icon} text-lg text-[#731F94]`;
  iconElement.setAttribute('aria-hidden', 'true');
  labelRow.append(iconElement);
  link.replaceChildren(
    labelRow,
    makeText('p', 'mt-1 text-xl font-extrabold', value),
    makeText('p', 'mt-1 text-xs text-[#625B6D]', detail),
  );
};

const renderApiMetrics = ({ cvs, gaps, roadmaps, opportunities, matches }, pending = new Set()) => {
  const signedIn = Boolean(activeSession?.token);
  const latestCv = latestFirst(cvs)[0];
  const latestGap = latestFirst(gaps.filter((gap) => !latestCv || gap.cvId === latestCv.id))[0];
  const latestRoadmap = latestFirst(roadmaps)[0];
  const completedGap = latestGap?.status === 'completed';
  const analysisPending = pending.has('cvs') || pending.has('gaps');
  const ringValue = document.getElementById('readiness-percent');
  const ring = ringValue?.parentElement?.parentElement;
  if (ringValue) {
    ringValue.textContent = !signedIn ? '—' : analysisPending ? '…' : completedGap ? '✓' : latestCv ? '…' : '—';
    ringValue.setAttribute('aria-label', !signedIn ? 'Sign in to load your CV analysis' : analysisPending ? 'Loading CV analysis' : completedGap ? 'CV analysis complete' : latestCv ? 'CV analysis pending' : 'No CV uploaded');
  }
  if (ring) ring.style.background = '#e6ddf8';
  const readinessCard = ring?.parentElement;
  const readinessCopy = readinessCard?.lastElementChild;
  if (readinessCopy) {
    readinessCopy.children[0].textContent = 'CV ANALYSIS';
    readinessCopy.children[1].textContent = !signedIn
      ? 'Sign in required'
      : analysisPending
      ? 'Loading account data'
      : completedGap
      ? 'Analysis complete'
      : latestCv ? 'Analysis pending' : 'No CV uploaded';
    readinessCopy.children[2].textContent = !signedIn
      ? 'Sign in to load your CV analysis'
      : latestGap
      ? `${(latestGap.currentSkills || []).length} skills found • ${(latestGap.missingSkills || []).length} to develop`
      : analysisPending ? 'Checking your saved CV and analysis'
        : latestCv ? 'Continue to run your CV analysis' : 'Upload a CV to get started';
  }

  renderMetricLink(
    'roadmap.html',
    'Your Roadmaps',
    !signedIn ? '—' : pending.has('roadmaps') ? '…' : String(roadmaps.length),
    !signedIn ? 'Sign in to load your roadmaps'
      : pending.has('roadmaps') ? 'Loading your account roadmaps'
      : latestRoadmap ? `${latestRoadmap.targetRole || latestRoadmap.title} • ${latestRoadmap.status}` : 'No roadmap in your account yet',
    'ph-calendar-blank',
  );
  renderMetricLink(
    'skill-gap.html',
    'CV Skill Analysis',
    !signedIn ? 'Sign in required'
      : latestGap ? `${(latestGap.currentSkills || []).length} skills found`
      : analysisPending ? 'Loading…' : 'Not analyzed',
    !signedIn ? 'Sign in to load your skill analysis'
      : latestGap ? `${(latestGap.missingSkills || []).length} skills to develop`
      : analysisPending ? 'Checking your CV analysis' : latestCv ? 'Analyze your uploaded CV' : 'Upload a CV to get started',
    'ph-seal-check',
  );
  const matchedCount = matches.length;
  renderMetricLink(
    'opportunities.html',
    'Job Opportunities',
    !signedIn ? '—' : pending.has('opportunities') ? '…' : String(opportunities.length),
    !signedIn ? 'Sign in to load your opportunities'
      : pending.has('matches') ? 'Loading account matches'
      : matchedCount ? `${matchedCount} API-generated matches` : 'Listings from the opportunities API',
    'ph-briefcase',
  );
  return { latestCv, latestGap, latestRoadmap };
};

const renderApiLearning = (roadmap, progress, pending = new Set()) => {
  const section = document.querySelector('[aria-labelledby="sprint-title"]');
  if (!section) return;
  section.hidden = false;
  const heading = makeText('h2', 'mt-2 text-xl font-bold tracking-tight sm:text-2xl', roadmap?.title || (!activeSession ? 'Sign in to view your roadmap' : pending.has('roadmaps') ? 'Loading your roadmap…' : 'No roadmap created yet'));
  heading.id = 'sprint-title';
  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-start justify-between gap-3';
  const headingGroup = document.createElement('div');
  headingGroup.append(
    makeText('p', 'text-[11px] font-semibold text-[#81798B]', 'ACCOUNT ROADMAP'),
    heading,
    makeText('p', 'mt-2 text-xs leading-5 text-[#625B6D]', roadmap?.summary || (!activeSession ? 'Sign in to load roadmap details for your account.' : pending.has('roadmaps') ? 'Loading your account roadmap…' : 'Your roadmap will appear here when generated from a completed CV skill analysis.')),
  );
  header.append(headingGroup);
  if (roadmap?.status) header.append(makeText('span', 'rounded-full bg-[#EEE8FF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#731F94]', roadmap.status));

  const body = document.createElement('div');
  body.className = 'mt-5 space-y-3';
  if (progress.length) {
    latestFirst(progress).slice(0, 4).forEach((item) => {
      const percent = Number.isFinite(item.progressPercentage) ? item.progressPercentage : null;
      const record = document.createElement('article');
      record.className = 'rounded-xl bg-[#F5F0FD] p-4';
      record.append(
        makeText('p', 'text-sm font-semibold text-[#181445]', item.recommendation?.title || item.title || 'Learning progress'),
        makeText('p', 'mt-1 text-xs text-[#625B6D]', percent === null ? item.status || 'Progress recorded' : `${percent}% complete • ${item.status || 'in progress'}`),
      );
      body.append(record);
    });
  } else {
    body.append(makeText('p', 'rounded-xl bg-[#F5F0FD] p-4 text-sm text-[#625B6D]', !activeSession ? 'Sign in to load learning progress for your account.' : pending.has('progress') ? 'Loading your learning progress…' : 'No learning progress records are available for this account yet.'));
  }
  if (activeSession && !roadmap && !pending.has('roadmaps')) {
    const link = makeText('a', 'inline-flex rounded-lg bg-[#731F94] px-4 py-2.5 text-sm font-semibold text-white', 'Review your CV skill gaps');
    link.href = 'skill-gap.html';
    body.append(link);
  }
  section.replaceChildren(header, body);
};

const renderDashboardJobs = (opportunities, matches, isLoading = false) => {
  if (!dashboardJobList) return;
  if (dashboardJobSection) dashboardJobSection.hidden = false;
  const matchById = new Map(matches.map((match) => [
    match.opportunityId || match.opportunity?.id,
    match,
  ]));
  const matchItems = matches
    .map((match) => ({
      opportunity: match.opportunity || opportunities.find((item) => item.id === match.opportunityId),
      match,
    }))
    .filter((item) => item.opportunity);
  const displayItems = matchItems.length
    ? matchItems.sort((a, b) => (b.match.matchPercentage || 0) - (a.match.matchPercentage || 0))
    : opportunities.map((opportunity) => ({ opportunity, match: matchById.get(opportunity.id) }));
  const uniqueItems = [...new Map(displayItems.map((item) => [item.opportunity.id, item])).values()].slice(0, 3);
  dashboardJobList.replaceChildren();
  jobCards = [];

  uniqueItems.forEach(({ opportunity, match }) => {
    const card = document.createElement('article');
    card.className = 'job-card rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(24,20,69,0.04)] sm:p-6';
    card.dataset.opportunityId = opportunity.id;
    const top = document.createElement('div');
    top.className = 'flex flex-wrap items-start gap-3';
    const companyInitial = makeText('span', 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEE8FF] text-xl font-bold text-[#731F94]', (opportunity.company || 'J').slice(0, 1).toUpperCase());
    const summary = document.createElement('div');
    summary.className = 'min-w-[180px] flex-1';
    summary.append(
      makeText('span', 'text-xs font-semibold text-[#731F94]', opportunity.company || 'Company not listed'),
      makeText('h3', 'mt-1 text-base font-bold', opportunity.title || 'Untitled opportunity'),
      makeText('p', 'mt-1 text-xs text-[#625B6D]', [opportunity.workMode, opportunity.location].filter(Boolean).join(' • ') || 'Work location not listed'),
    );
    const score = match && Number.isFinite(match.matchPercentage)
      ? `${match.matchPercentage}% API match`
      : 'Match not calculated';
    const matchLabel = makeText('span', 'rounded-full bg-[#EEE8FF] px-3 py-2 text-sm font-bold text-[#731F94]', score);
    top.append(companyInitial, summary, matchLabel);
    card.append(top);
    const rationale = match?.explanation
      || (opportunity.requiredSkills?.length ? `Required skills: ${opportunity.requiredSkills.join(', ')}` : 'The API did not provide match details for this role.');
    card.append(makeText('p', 'mt-4 rounded-lg bg-[#F5F0FD] px-3 py-2 text-xs leading-5 text-[#625B6D]', rationale));
    const actions = document.createElement('div');
    actions.className = 'mt-4 flex flex-wrap gap-3 text-xs font-semibold';
    const browse = makeText('a', 'text-[#731F94] hover:underline', 'View opportunity details');
    browse.href = `opportunities.html?q=${encodeURIComponent(opportunity.title || '')}`;
    actions.append(browse);
    if (opportunity.applicationUrl) {
      try {
        const applicationUrl = new URL(opportunity.applicationUrl);
        if (['http:', 'https:'].includes(applicationUrl.protocol)) {
          const apply = makeText('a', 'text-[#731F94] hover:underline', 'Apply on employer site');
          apply.href = applicationUrl.href;
          apply.target = '_blank';
          apply.rel = 'noopener noreferrer';
          actions.append(apply);
        }
      } catch {
        // Ignore invalid application links returned by the API.
      }
    }
    card.append(actions);
    dashboardJobList.append(card);
    jobCards.push(card);
  });

  const matchHeading = document.getElementById('matches-title');
  if (matchHeading) matchHeading.textContent = !activeSession ? 'Your job opportunities' : matches.length ? 'Your API-generated job matches' : 'Job opportunities from SkillBridge';
  const matchBadge = matchHeading?.parentElement?.querySelector('span');
  if (matchBadge) {
    matchBadge.textContent = matches.length ? `${matches.length} matches` : `${opportunities.length} listings`;
    matchBadge.classList.toggle('hidden', opportunities.length === 0);
  }
  if (!uniqueItems.length) {
    emptyState.textContent = !activeSession
      ? 'Sign in to load opportunities for your account.'
      : isLoading
      ? 'Loading opportunities from your account…'
      : opportunities.length
      ? 'No opportunities match your saved profile data.'
      : 'No job opportunities were returned by the API.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }
};

const loadDashboardApiSummary = async () => {
  const session = window.SkillBridgeApi.session();
  if (!session) {
    dashboardApiStatus.textContent = 'Sign in to load account-specific CV analysis, roadmap, and job opportunities.';
    renderDashboardJobs([], []);
    renderApiMetrics({ cvs: [], gaps: [], roadmaps: [], opportunities: [], matches: [] });
    renderApiLearning(null, []);
    return;
  }
  const endpoints = [
    ['account', '/api/v1/users/me'],
    ['profile', '/api/v1/profiles/me'],
    ['cvs', '/api/v1/cvs/my-cvs'],
    ['roadmaps', '/api/v1/roadmaps'],
    ['gaps', '/api/v1/skill-gaps'],
    ['opportunities', '/api/v1/opportunities'],
    ['matches', '/api/v1/matching'],
    ['progress', '/api/v1/progress'],
  ];
  const data = {};
  const failures = new Map();
  const pending = new Set(endpoints.map(([key]) => key));

  const refresh = () => {
    const account = data.account;
    const profile = data.profile?.profile;
    if (account?.fullName) {
      const first = account.fullName.trim().split(/\s+/)[0] || 'Candidate';
      const last = account.fullName.trim().split(/\s+/).slice(-1)[0] || '';
      document.querySelectorAll('[data-candidate-name]').forEach((element) => { element.textContent = first; });
      document.getElementById('topbar-user-name').textContent = `${first} ${last ? `${last[0]}.` : ''}`.trim();
    }
    if (profile?.careerGoal) {
      document.querySelectorAll('[data-track-name]').forEach((element) => { element.textContent = profile.careerGoal; });
      document.getElementById('topbar-user-track').textContent = profile.careerGoal;
    }
    if (profileLocation) profileLocation.textContent = profile?.location ? `• ${profile.location}` : '';
    const cvs = listFrom(data.cvs);
    const roadmaps = listFrom(data.roadmaps);
    const gaps = listFrom(data.gaps);
    const opportunities = listFrom(data.opportunities);
    const matches = listFrom(data.matches);
    const progress = listFrom(data.progress);
    const summary = renderApiMetrics({ cvs, gaps, roadmaps, opportunities, matches }, pending);
    renderApiLearning(summary.latestRoadmap, progress, pending);
    renderDashboardJobs(opportunities, matches, pending.has('opportunities') || pending.has('matches'));

    const loadedCount = endpoints.length - pending.size;
    const details = `${loadedCount} of ${endpoints.length} account data sources loaded.`;
    const failureDetails = [...failures.entries()].map(([key, error]) => `${key}: ${error}`).join(' ');
    dashboardApiStatus.classList.toggle('text-red-700', failures.size > 0);
    dashboardApiStatus.textContent = [
      details,
      pending.size ? `Loading ${[...pending].join(', ')}…` : '',
      failureDetails ? `Some data could not be refreshed: ${failureDetails}` : '',
    ].filter(Boolean).join(' ');

    if (!pending.has('cvs') && !pending.has('gaps') && summary.latestCv && !summary.latestGap) {
      dashboardApiStatus.append(' Your CV has not been analyzed yet. ');
      const analyzeLink = makeText('a', 'font-semibold text-[#731F94] underline', 'Continue CV analysis');
      analyzeLink.href = 'cv-upload.html';
      dashboardApiStatus.append(analyzeLink);
    }
  };

  refresh();
  await Promise.all(endpoints.map(async ([key, path]) => {
    try {
      data[key] = window.SkillBridgeApi.unwrap(await window.SkillBridgeApi.get(path));
    } catch (error) {
      failures.set(key, error?.message || 'Unknown API error');
    } finally {
      pending.delete(key);
      refresh();
    }
  }));
};

loadDashboardApiSummary();
