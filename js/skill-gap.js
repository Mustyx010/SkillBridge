
const sessionUser = window.SkillBridgeApi.session()?.user;
const name = sessionUser?.fullName || 'Candidate';
const firstName = name.trim().split(/\s+/)[0] || 'Candidate';
const lastName = name.trim().split(/\s+/).at(-1) || '';

document.getElementById('skill-gap-user-name').textContent =
  `${firstName} ${lastName && lastName !== firstName ? `${lastName[0]}.` : ''}`;

document.querySelector('header span.ml-auto')?.remove();
document.title = 'Skill Gap Analysis | SkillBridge';

// Sidebar
const sidebar = document.getElementById('skill-gap-sidebar');
const backdrop = document.getElementById('skill-gap-backdrop');
const menuButton = document.getElementById('skill-gap-menu-button');

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
  if (event.key === 'Escape') setSidebarOpen(false);
});

// Main elements
const grid = document.getElementById('matrix-grid');
const cardView = document.getElementById('card-view-button');
const hierarchyView = document.getElementById('hierarchy-view-button');
const summarySection = document.querySelector('[aria-label="Skill gap summary"]');
const heroSection = document.querySelector('[aria-labelledby="page-title"]');
const benchmarkSection = document.querySelector('[aria-label="National benchmark and credential"]');
const analysisContent = document.getElementById('cv-analysis-content');

let cards = [];

// Page heading
heroSection?.replaceChildren();

if (heroSection) {
  const heading = document.createElement('h1');
  heading.id = 'page-title';
  heading.className = 'text-3xl font-extrabold tracking-tight sm:text-4xl';
  heading.textContent = 'Your Skill Gap Analysis';

  const description = document.createElement('p');
  description.className = 'mt-2 text-sm leading-6 text-[#625B6D]';
  description.textContent =
    'Skills and development areas below come from your saved CV analysis.';

  heroSection.append(heading, description);
}

// Helper to create safe DOM elements
const makeElement = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
};

// Summary cards
if (summarySection) {
  summarySection.replaceChildren();
  summarySection.className = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4';
  summarySection.setAttribute('aria-label', 'API skill gap summary');
  summarySection.dataset.apiSummary = '';
  summarySection.setAttribute('aria-busy', 'true');

  [
    ['Analysis status', 'Loading…'],
    ['Current skills', '—'],
    ['Required skills', '—'],
    ['Skills to develop', '—'],
  ].forEach(([label, value]) => {
    const card = makeElement(
      'article',
      'rounded-xl bg-white p-5 shadow-sm',
      ''
    );

    card.append(
      makeElement(
        'p',
        'text-[10px] font-bold uppercase tracking-wide text-[#81798B]',
        label
      ),
      makeElement(
        'p',
        'mt-3 text-3xl font-extrabold text-[#731F94]',
        value
      )
    );

    summarySection.append(card);
  });
}

// Skill matrix setup
const matrixSection = grid.closest('section');
const matrixTitle = matrixSection?.querySelector('#matrix-title');

if (matrixTitle) {
  matrixTitle.textContent = 'Skills to develop';
}

cardView.parentElement.hidden = true;

const matrixDescription = matrixSection?.querySelector('h2 + p');

if (matrixDescription) {
  matrixDescription.textContent =
    'Current, required, and missing skills returned by your CV analysis.';
}

grid.replaceChildren();
benchmarkSection?.remove();

// Existing skill-gap panel
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

// Render a list of skills
const renderGapList = (label, skills) => {
  const section = document.createElement('div');
  section.className = 'rounded-xl bg-[#F8F4FF] p-4';

  const heading = makeElement(
    'h3',
    'text-xs font-bold uppercase text-[#731F94]',
    label
  );

  const list = document.createElement('ul');
  list.className = 'mt-2 space-y-1 text-xs text-[#4A4455]';

  const items = Array.isArray(skills) ? skills : [];

  (items.length ? items : ['No skills returned']).forEach((skill) => {
    const item = document.createElement('li');

    const skillName =
      typeof skill === 'string'
        ? skill
        : skill?.name || skill?.skill || JSON.stringify(skill);

    item.textContent = skillName;
    list.append(item);
  });

  section.append(heading, list);

  return section;
};

// Summary card values
const setSummary = (gap, fallbackStatus = 'No analysis') => {
  const values = gap
    ? [
        gap.status || 'Unknown',
        String(gap.currentSkills?.length || 0),
        String(gap.requiredSkills?.length || 0),
        String(gap.missingSkills?.length || 0),
      ]
    : [fallbackStatus, '—', '—', '—'];

  summarySection?.querySelectorAll('article p:last-child').forEach((value, index) => {
    value.textContent = values[index];
  });

  summarySection?.setAttribute('aria-busy', 'false');
};


// Format action-plan phases and their learning activities
const getActionPlanDetails = (item) => {
  if (!item || typeof item !== 'object') {
    return {
      phase: 'Recommended Development Step',
      focus: '',
      actionItems: typeof item === 'string' ? [item] : [],
    };
  }

  return {
    phase: item.phase || 'Recommended Development Step',
    focus: item.focus || '',
    actionItems: Array.isArray(item.action_items)
      ? item.action_items
      : Array.isArray(item.actionItems)
        ? item.actionItems
        : [],
  };
};

// Render AI-generated action plan
const renderActionPlan = (actionPlan) => {
  const section = document.createElement('section');
  section.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';

  section.append(
    makeElement(
      'h3',
      'text-lg font-bold text-[#731F94]',
      'Recommended Action Plan'
    ),
    makeElement(
      'p',
      'mt-1 text-sm text-[#625B6D]',
      'Follow these recommended learning activities to prepare for your target career.'
    )
  );

  const list = document.createElement('div');
  list.className = 'mt-5 space-y-4';

  const items = Array.isArray(actionPlan) ? actionPlan : [];

  if (!items.length) {
    list.append(
      makeElement(
        'p',
        'rounded-xl bg-[#F8F4FF] p-4 text-sm text-[#625B6D]',
        'No action plan was returned by the analysis.'
      )
    );
  } else {
    items.forEach((item, index) => {
      const details = getActionPlanDetails(item);

      const card = makeElement(
        'article',
        'rounded-xl bg-[#F8F4FF] p-4 sm:p-5',
        ''
      );

      const header = document.createElement('div');
      header.className = 'flex items-start gap-3';

      const number = makeElement(
        'span',
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#731F94] text-sm font-bold text-white',
        index + 1
      );

      const phaseContent = document.createElement('div');
      phaseContent.className = 'min-w-0';

      phaseContent.append(
        makeElement(
          'h4',
          'text-sm font-bold text-[#181445]',
          details.phase
        )
      );

      if (details.focus) {
        phaseContent.append(
          makeElement(
            'p',
            'mt-1 text-sm font-semibold text-[#731F94]',
            details.focus
          )
        );
      }

      header.append(number, phaseContent);
      card.append(header);

      if (details.actionItems.length) {
        const activityList = document.createElement('ul');
        activityList.className =
          'mt-4 ml-11 list-disc space-y-2 pl-4 text-sm leading-6 text-[#625B6D]';

        details.actionItems.forEach((activity) => {
          const activityText =
            typeof activity === 'string'
              ? activity
              : activity?.description ||
                activity?.title ||
                activity?.task ||
                '';

          if (!activityText) return;

          activityList.append(
            makeElement('li', '', activityText)
          );
        });

        card.append(activityList);
      }

      list.append(card);
    });
  }

  section.append(list);

  return section;
};


// Render complete AI analysis
const renderAIAnalysis = (gap) => {
  analysisContent.replaceChildren();

  const analysis = gap.analysisResult || {};

  const recommendation =
    analysis.recommended_career_path ||
    analysis.recommendedCareerPath ||
    {};

  const profileSummary =
    analysis.profile_summary ||
    analysis.profileSummary ||
    'No profile summary was returned by the analysis.';

  const currentLevel =
    analysis.current_level ||
    analysis.currentLevel ||
    'Not specified';

  const targetRole =
    recommendation.target_role ||
    recommendation.targetRole ||
    gap.targetJobTitle ||
    'Career recommendation unavailable';

  const matchPercentage =
    recommendation.match_percentage ??
    recommendation.matchPercentage;

  const identifiedSkills =
    analysis.identified_skills ||
    analysis.identifiedSkills ||
    gap.currentSkills ||
    [];

  const skillGaps =
    analysis.skill_gaps ||
    analysis.skillGaps ||
    gap.missingSkills ||
    [];

  const actionPlan =
    recommendation.action_plan ||
    recommendation.actionPlan ||
    analysis.action_plan ||
    analysis.actionPlan ||
    [];

  // Profile summary
  const profileCard = document.createElement('article');
  profileCard.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';

  profileCard.append(
    makeElement(
      'h3',
      'text-lg font-bold text-[#731F94]',
      'Profile Summary'
    ),
    makeElement(
      'p',
      'mt-3 text-sm leading-7 text-[#625B6D]',
      profileSummary
    )
  );

  // Career recommendation
  const careerCard = document.createElement('article');
  careerCard.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';

  const careerTop = document.createElement('div');
  careerTop.className = 'flex flex-wrap items-start justify-between gap-4';

  const careerInfo = document.createElement('div');
  careerInfo.className = 'min-w-0';

  careerInfo.append(
    makeElement(
      'p',
      'text-[10px] font-bold uppercase tracking-wide text-[#81798B]',
      'Recommended career path'
    ),
    makeElement(
      'h3',
      'mt-2 text-xl font-extrabold text-[#181445]',
      targetRole
    ),
    makeElement(
      'p',
      'mt-2 text-sm text-[#625B6D]',
      `Current level: ${currentLevel}`
    )
  );

  careerTop.append(careerInfo);

  if (matchPercentage !== undefined && matchPercentage !== null) {
    const matchCard = makeElement(
      'div',
      'rounded-xl bg-[#F4EFFF] px-5 py-3 text-center',
      ''
    );

    matchCard.append(
      makeElement(
        'p',
        'text-2xl font-extrabold text-[#731F94]',
        `${matchPercentage}%`
      ),
      makeElement(
        'p',
        'mt-1 text-[10px] font-bold uppercase tracking-wide text-[#625B6D]',
        'Career match'
      )
    );

    careerTop.append(matchCard);
  }

  careerCard.append(careerTop);

  // Skills identified by AI
  const identifiedSection = document.createElement('section');
  identifiedSection.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';

  identifiedSection.append(
    makeElement(
      'h3',
      'text-lg font-bold text-[#731F94]',
      'Skills Identified in Your CV'
    ),
    makeElement(
      'p',
      'mt-1 text-sm text-[#625B6D]',
      'These are the skills identified from your CV by the AI analysis.'
    )
  );

  const identifiedList = document.createElement('div');
  identifiedList.className = 'mt-4 flex flex-wrap gap-2';

  if (Array.isArray(identifiedSkills) && identifiedSkills.length) {
    identifiedSkills.forEach((skill) => {
      const skillName =
        typeof skill === 'string'
          ? skill
          : skill?.name || skill?.skill || '';

      if (!skillName) return;

      identifiedList.append(
        makeElement(
          'span',
          'rounded-full bg-[#F4EFFF] px-3 py-2 text-xs font-semibold text-[#731F94]',
          skillName
        )
      );
    });
  } else {
    identifiedList.append(
      makeElement(
        'p',
        'text-sm text-[#625B6D]',
        'No identified skills were returned.'
      )
    );
  }

  identifiedSection.append(identifiedList);

  // Skills to develop
  const missingSection = document.createElement('section');
  missingSection.className = 'rounded-2xl bg-white p-5 shadow-sm sm:p-6';

  missingSection.append(
    makeElement(
      'h3',
      'text-lg font-bold text-[#731F94]',
      'Skills to Develop'
    ),
    makeElement(
      'p',
      'mt-1 text-sm text-[#625B6D]',
      'These are the areas the AI identified as development priorities.'
    )
  );

  const missingList = document.createElement('div');
  missingList.className = 'mt-4 flex flex-wrap gap-2';

  if (Array.isArray(skillGaps) && skillGaps.length) {
    skillGaps.forEach((skill) => {
      const skillName =
        typeof skill === 'string'
          ? skill
          : skill?.name || skill?.skill || '';

      if (!skillName) return;

      missingList.append(
        makeElement(
          'span',
          'rounded-full bg-[#FFF4E8] px-3 py-2 text-xs font-semibold text-[#99520A]',
          skillName
        )
      );
    });
  } else {
    missingList.append(
      makeElement(
        'p',
        'text-sm text-[#625B6D]',
        'No skill gaps were returned.'
      )
    );
  }

  missingSection.append(missingList);

  // Append all AI analysis sections
  analysisContent.append(
    profileCard,
    careerCard,
    identifiedSection,
    missingSection,
    renderActionPlan(actionPlan)
  );

  analysisContent.setAttribute('aria-busy', 'false');
};

// Search skill cards
const applySkillSearch = () => {
  const query = document.getElementById('skill-gap-search').value.trim().toLowerCase();

  let visibleCount = 0;

  cards.forEach((card) => {
    const matches = !query || card.textContent.toLowerCase().includes(query);

    card.classList.toggle('hidden', !matches);

    if (matches) visibleCount += 1;
  });

  document.getElementById('skill-search-empty').classList.toggle(
    'hidden',
    visibleCount > 0 || !cards.length
  );
};

// Add a missing skill to the roadmap
const addSkillToRoadmap = async (skill, button) => {
  const stopLoading = window.SkillBridgeApi.setLoading(
    button,
    'Adding to roadmap…'
  );

  try {
    const skillGapId = localStorage.getItem('skillbridgeSkillGapId');

    if (!skillGapId) {
      throw new Error('Analyze your CV before adding a skill to a roadmap.');
    }

    let response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
    let data = window.SkillBridgeApi.unwrap(response);

    let roadmaps = Array.isArray(data) ? data : data?.items || [];

    let roadmap = roadmaps.find((item) => item.skillGapId === skillGapId);

    if (!roadmap) {
      await window.SkillBridgeApi.post('/api/v1/roadmaps/generate', {
        skillGapId,
      });

      response = await window.SkillBridgeApi.get('/api/v1/roadmaps');
      data = window.SkillBridgeApi.unwrap(response);

      roadmaps = Array.isArray(data) ? data : data?.items || [];

      roadmap = roadmaps.find((item) => item.skillGapId === skillGapId);
    }

    if (!roadmap?.id) {
      throw new Error('The API did not return a roadmap ID.');
    }

    await window.SkillBridgeApi.post(
      `/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}/tasks`,
      {
        phase: 60,
        title: `Develop ${skill}`,
        description: `Practice and demonstrate ${skill} for your target career.`,
        taskType: 'learn',
        skill: skill.toLowerCase(),
        status: 'todo',
      }
    );

    stopLoading();

    button.textContent = 'Added to roadmap';
    button.disabled = true;

    showDialog(
      'Added to your roadmap',
      `${skill} has been saved to your API roadmap.`
    );
  } catch (error) {
    stopLoading();

    showDialog(
      'Could not update your roadmap',
      error.message
    );
  }
};

// Render skill-gap data
const renderSkillGap = (gap) => {
  if (!gap || !gap.id) {
    throw new Error('The API did not return a valid skill-gap analysis.');
  }

  localStorage.setItem('skillbridgeSkillGapId', gap.id);

  setSummary(gap);

  // Render the complete AI analysis
  renderAIAnalysis(gap);

  gapTitle.textContent =
    gap.targetJobTitle || 'Your CV skill-gap analysis';

  gapStatus.textContent =
    `Analysis status: ${gap.status || 'unknown'}${
      gap.updatedAt
        ? ` • Updated ${new Date(gap.updatedAt).toLocaleDateString()}`
        : ''
    }`;

  gapDetails.replaceChildren(
    renderGapList('Current skills', gap.currentSkills),
    renderGapList('Required skills', gap.requiredSkills),
    renderGapList('Skills to develop', gap.missingSkills)
  );

  grid.replaceChildren();

  const missingSkills = Array.isArray(gap.missingSkills)
    ? gap.missingSkills
    : [];

  missingSkills.forEach((skill) => {
    const card = makeElement(
      'article',
      'matrix-card rounded-xl bg-white p-4 shadow-sm',
      ''
    );

    card.append(
      makeElement(
        'h3',
        'text-sm font-bold',
        skill
      ),
      makeElement(
        'p',
        'mt-2 text-xs text-[#625B6D]',
        'Identified as a skill to develop in your CV analysis.'
      )
    );

    const button = makeElement(
      'button',
      'mt-3 w-full rounded-lg bg-[#731F94] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#8F08B8]',
      'Add to roadmap'
    );

    button.type = 'button';

    button.addEventListener('click', () => {
      addSkillToRoadmap(skill, button);
    });

    card.append(button);
    grid.append(card);
  });

  cards = [...grid.querySelectorAll('.matrix-card')];

  if (!cards.length) {
    grid.append(
      makeElement(
        'p',
        'rounded-xl bg-white p-5 text-sm text-[#625B6D]',
        'This analysis did not return skills to develop.'
      )
    );
  }

  applySkillSearch();
};

// Load saved skill-gap analysis
const loadApiSkillGap = async () => {
  if (!window.SkillBridgeApi.session()) {
    setSummary(null, 'Sign in required');

    gapStatus.textContent =
      'Sign in to load your saved skill-gap analysis.';

    analysisContent.replaceChildren(
      makeElement(
        'p',
        'rounded-xl bg-white p-5 text-sm text-[#625B6D]',
        'Sign in to view your CV analysis.'
      )
    );

    analysisContent.setAttribute('aria-busy', 'false');

    const link = makeElement(
      'a',
      'mt-3 inline-flex font-semibold text-[#731F94] underline',
      'Sign in'
    );

    link.href = 'signin.html';

    gapDetails.replaceChildren(link);
    grid.replaceChildren();

    return;
  }

  gapStatus.textContent = 'Loading your skill-gap analysis…';
  gapStatus.setAttribute('aria-busy', 'true');

  try {
    const response = await window.SkillBridgeApi.get('/api/v1/skill-gaps');

    const gaps = window.SkillBridgeApi.unwrap(response);

    if (!Array.isArray(gaps)) {
      throw new Error('The API returned an invalid skill-gap list.');
    }

    const storedId = localStorage.getItem('skillbridgeSkillGapId');

    const gap =
      gaps.find((item) => item.id === storedId) ||
      [...gaps].sort(
        (a, b) =>
          Date.parse(b.updatedAt || b.createdAt || 0) -
          Date.parse(a.updatedAt || a.createdAt || 0)
      )[0];

    if (!gap) {
      setSummary(null);

      gapStatus.textContent =
        'No skill-gap analysis is saved yet. Upload your CV and continue to generate one.';

      analysisContent.replaceChildren(
        makeElement(
          'p',
          'rounded-xl bg-white p-5 text-sm text-[#625B6D]',
          'No CV analysis is available yet.'
        )
      );

      analysisContent.setAttribute('aria-busy', 'false');

      const link = makeElement(
        'a',
        'mt-3 inline-flex font-semibold text-[#731F94] underline',
        'Upload and analyze your CV'
      );

      link.href = 'cv-upload.html';

      gapDetails.replaceChildren(link);
      grid.replaceChildren();

      return;
    }

    renderSkillGap(gap);
  } catch (error) {
    setSummary(null, 'Unavailable');

    gapStatus.classList.add('text-red-700');
    gapStatus.textContent =
      `Skill-gap data could not be loaded: ${error.message}`;

    analysisContent.replaceChildren(
      makeElement(
        'p',
        'rounded-xl bg-white p-5 text-sm text-red-700',
        `Your CV analysis could not be displayed: ${error.message}`
      )
    );

    analysisContent.setAttribute('aria-busy', 'false');
  }
};

loadApiSkillGap();

// Card and hierarchy views
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

// Search
const searchForm = document.getElementById('skill-gap-search-form');
const searchInput = document.getElementById('skill-gap-search');

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
});

searchInput.addEventListener('input', applySkillSearch);

// Dialog
const dialog = document.getElementById('skill-gap-dialog');
const dialogTitle = document.getElementById('skill-gap-dialog-title');
const dialogCopy = document.getElementById('skill-gap-dialog-copy');

const showDialog = (heading, message) => {
  dialogTitle.textContent = heading;
  dialogCopy.textContent = message;
  dialog.showModal();
};

document
  .querySelectorAll('[data-close-skill-gap-dialog]')
  .forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
