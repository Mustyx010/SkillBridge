// =====================================================
// 1. HELPERS
// =====================================================

const safeRead = (key, fallback) => {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );

    return value ?? fallback;
  } catch {
    return fallback;
  }
};

// Read a field that may use camelCase or snake_case.
const getField = (object, ...keys) => {
  if (!object || typeof object !== 'object') return undefined;

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ''
    ) {
      return object[key];
    }
  }

  return undefined;
};

// Extract an array from different API response structures.
const extractList = (value, depth = 0) => {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== 'object' || depth > 6) {
    return [];
  }

  const possibleKeys = [
    'items',
    'results',
    'opportunities',
    'matches',
    'matched_jobs',
    'data',
    'records',
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }

    const result = extractList(value[key], depth + 1);

    if (result.length) {
      return result;
    }
  }

  return [];
};

const getMatchScore = (match) => {
  const score = getField(
    match,
    'matchPercentage',
    'match_percentage',
    'matchScore',
    'match_score',
    'score',
    'percentage'
  );

  const number = Number(score);

  return Number.isFinite(number) ? number : null;
};

const getOpportunityId = (match) => {
  const opportunity = match?.opportunity || match?.job || {};

  return String(
    getField(
      match,
      'opportunityId',
      'opportunity_id',
      'jobId',
      'job_id'
    ) ||
    getField(opportunity, 'id', 'opportunityId', 'opportunity_id') ||
    match?.id ||
    ''
  );
};

const getWorkMode = (opportunity) => {
  const value = String(
    getField(
      opportunity,
      'workMode',
      'work_mode',
      'workType',
      'work_type',
      'locationType',
      'location_type'
    ) || ''
  ).toLowerCase();

  if (value.includes('remote')) return 'remote';
  if (value.includes('hybrid')) return 'hybrid';

  if (
    value.includes('onsite') ||
    value.includes('on-site') ||
    value.includes('office')
  ) {
    return 'onsite';
  }

  return 'all';
};

const workModeLabel = (workMode) => {
  const labels = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  };

  return labels[workMode] || 'Work mode not specified';
};

const daysRemaining = (deadline) => {
  if (!deadline) return 'Not specified';

  const deadlineTime = new Date(deadline).getTime();

  if (!Number.isFinite(deadlineTime)) {
    return 'Not specified';
  }

  const days = Math.ceil(
    (deadlineTime - Date.now()) / 86400000
  );

  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';

  return `${days} days`;
};

const safeApplicationUrl = (url) => {
  if (!url) return '';

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol === 'http:' ||
      parsedUrl.protocol === 'https:'
    ) {
      return parsedUrl.href;
    }
  } catch {
    return '';
  }

  return '';
};

// =====================================================
// 2. USER INFORMATION
// =====================================================

const session = window.SkillBridgeApi.session();
const profile = session?.user || {};

const survey = session
  ? safeRead('skillbridge_survey', {})
  : {};

const candidateName =
  profile.fullName ||
  profile.full_name ||
  profile.name ||
  survey.data?.fullName ||
  'Candidate';

const nameParts = candidateName.trim().split(/\s+/);

const candidateFirst = nameParts[0] || 'Candidate';
const candidateLast = nameParts.at(-1) || '';

const userNameElement = document.getElementById(
  'opportunities-user-name'
);

if (userNameElement) {
  userNameElement.textContent =
    `${candidateFirst} ${
      candidateLast && candidateLast !== candidateFirst
        ? `${candidateLast[0]}.`
        : ''
    }`;
}

// =====================================================
// 3. SIDEBAR
// =====================================================

const sidebar = document.getElementById(
  'opportunities-sidebar'
);

const backdrop = document.getElementById(
  'opportunities-backdrop'
);

const menuButton = document.getElementById(
  'opportunities-menu-button'
);

const toggleSidebar = (open) => {
  if (!sidebar || !backdrop || !menuButton) return;

  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);

  menuButton.setAttribute('aria-expanded', String(open));

  menuButton.setAttribute(
    'aria-label',
    open ? 'Close navigation' : 'Open navigation'
  );
};

menuButton?.addEventListener('click', () => {
  toggleSidebar(
    menuButton.getAttribute('aria-expanded') !== 'true'
  );
});

backdrop?.addEventListener('click', () => {
  toggleSidebar(false);
});

sidebar?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    toggleSidebar(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleSidebar(false);
  }
});

// =====================================================
// 4. PAGE ELEMENTS
// =====================================================

let cards = [
  ...document.querySelectorAll('.opportunity-card'),
];

const searchInput = document.getElementById(
  'opportunity-search'
);

const locationFilter = document.getElementById(
  'location-filter'
);

const globalSearch = document.getElementById(
  'global-opportunity-query'
);

const filterForm = document.getElementById(
  'opportunity-filters'
);

const resultCount = document.getElementById(
  'opportunity-count'
);

const status = document.getElementById(
  'opportunity-status'
);

const emptyState = document.getElementById(
  'opportunity-empty'
);

const opportunityList = document.getElementById(
  'opportunity-list'
);

const initialQuery =
  new URLSearchParams(window.location.search).get('q') || '';

if (globalSearch) globalSearch.value = initialQuery;
if (searchInput) searchInput.value = initialQuery;

// =====================================================
// 5. OPPORTUNITY DETAILS ELEMENTS
// =====================================================

const detail = {
  company: document.getElementById('detail-company'),
  role: document.getElementById('detail-role'),
  recruitment: document.getElementById('detail-recruitment'),
  closing: document.getElementById('detail-close'),
  sector: document.getElementById('detail-sector'),
  team: document.getElementById('detail-team'),
  location: document.getElementById('detail-location'),
  salary: document.getElementById('detail-salary'),
  fit: document.getElementById('detail-fit'),
  rationale: document.getElementById('detail-rationale'),
  icon: document.getElementById('detail-company-icon'),
  apply: document.getElementById('apply-selected-role'),
};

let selectedCard = null;

// =====================================================
// 6. SAVED OPPORTUNITIES
// =====================================================

let savedRoles = new Set(
  safeRead('skillbridgeSavedRoles', [])
);

const selectedRole = () =>
  selectedCard?.dataset.role || '';

const updateSaveState = () => {
  const saved = savedRoles.has(selectedRole());

  const detailSave = document.getElementById('detail-save');
  const footerSave = document.getElementById(
    'save-selected-role'
  );

  if (detailSave) {
    detailSave.setAttribute('aria-pressed', String(saved));

    detailSave.setAttribute(
      'aria-label',
      saved ? 'Remove saved opening' : 'Save this opening'
    );

    detailSave.innerHTML = saved
      ? '<i class="ph ph-bookmark-simple-fill"></i>'
      : '<i class="ph ph-bookmark-simple"></i>';
  }

  if (footerSave) {
    footerSave.setAttribute('aria-pressed', String(saved));

    footerSave.innerHTML = saved
      ? '<i class="ph ph-bookmark-simple-fill"></i>Saved for Later'
      : '<i class="ph ph-bookmark-simple"></i>Save for Later';

    footerSave.classList.toggle('bg-[#731F94]', saved);
    footerSave.classList.toggle('text-white', saved);
  }

  const savedCount = document.getElementById('saved-count');

  if (savedCount) {
    savedCount.textContent = String(savedRoles.size);
  }
};

const toggleSaved = () => {
  const role = selectedRole();

  if (!role) return;

  if (savedRoles.has(role)) {
    savedRoles.delete(role);
  } else {
    savedRoles.add(role);
  }

  localStorage.setItem(
    'skillbridgeSavedRoles',
    JSON.stringify([...savedRoles])
  );

  updateSaveState();

  if (status) {
    status.classList.remove('sr-only');

    status.textContent =
      'Saved opportunities are stored in this browser only. They are not currently saved to your SkillBridge account.';
  }
};

document
  .getElementById('detail-save')
  ?.addEventListener('click', toggleSaved);

document
  .getElementById('save-selected-role')
  ?.addEventListener('click', toggleSaved);

// =====================================================
// 7. SELECT AN OPPORTUNITY
// =====================================================

const selectCard = (card) => {
  if (!card) return;

  selectedCard = card;

  cards.forEach((item) => {
    const selected = item === card;

    item.setAttribute('aria-selected', String(selected));

    item.classList.toggle('border-l-4', selected);
    item.classList.toggle('border-[#731F94]', selected);

    item.classList.toggle(
      'shadow-[0_3px_14px_rgba(24,20,69,0.08)]',
      selected
    );
  });

  if (detail.company) {
    detail.company.textContent =
      card.dataset.company || 'Company not listed';
  }

  if (detail.role) {
    detail.role.textContent =
      card.dataset.role || 'Role not specified';
  }

  if (detail.recruitment) {
    detail.recruitment.textContent =
      card.dataset.recruitment || '—';
  }

  if (detail.closing) {
    detail.closing.textContent =
      card.dataset.close || 'Not specified';
  }

  if (detail.sector) {
    detail.sector.textContent =
      card.dataset.sector || 'Not specified';
  }

  if (detail.team) {
    const teamIcon = document.createElement('i');

    teamIcon.className =
      'ph ph-users-three text-[#731F94]';

    detail.team.replaceChildren(
      teamIcon,
      document.createTextNode(
        card.dataset.team || 'Not specified'
      )
    );
  }

  if (detail.location) {
    const locationIcon = document.createElement('i');

    locationIcon.className =
      'ph ph-buildings text-[#731F94]';

    detail.location.replaceChildren(
      locationIcon,
      document.createTextNode(
        card.dataset.work || 'Location not specified'
      )
    );
  }

  if (detail.salary) {
    detail.salary.textContent =
      card.dataset.salary || 'Compensation not listed';
  }

  if (detail.fit) {
    detail.fit.textContent =
      card.dataset.fit === '—'
        ? 'Not calculated'
        : `${card.dataset.fit}%`;
  }

  if (detail.rationale) {
    detail.rationale.textContent =
      card.dataset.rationale || 'No match explanation available.';
  }

  // Only API opportunities should have an active application link.
  if (detail.apply) {
    if (card.dataset.apiOpportunity === 'true') {
      const applicationUrl = safeApplicationUrl(
        card.dataset.applicationUrl
      );

      if (applicationUrl) {
        detail.apply.href = applicationUrl;
        detail.apply.target = '_blank';
        detail.apply.rel = 'noopener noreferrer';

        detail.apply.classList.remove(
          'pointer-events-none',
          'opacity-50'
        );

        detail.apply.textContent = 'Apply on Employer Site';
      } else {
        detail.apply.href = '#';
        detail.apply.removeAttribute('target');
        detail.apply.removeAttribute('rel');

        detail.apply.classList.add(
          'pointer-events-none',
          'opacity-50'
        );

        detail.apply.textContent =
          'No application link available';
      }
    } else {
      detail.apply.href = '#';

      detail.apply.classList.add(
        'pointer-events-none',
        'opacity-50'
      );

      detail.apply.textContent = 'Select a live opportunity';
    }
  }

  const cardIcon = card.querySelector('.ph');

  if (detail.icon) {
    detail.icon.className = cardIcon
      ? cardIcon.className
      : 'ph ph-briefcase';
  }

  updateSaveState();
};

// =====================================================
// 8. SEARCH AND FILTERING
// =====================================================

const updateVisibleCount = () => {
  const visible = cards.filter(
    (card) => !card.hidden
  );

  if (resultCount) {
    resultCount.textContent = String(visible.length);
  }

  if (emptyState) {
    emptyState.classList.toggle(
      'hidden',
      visible.length > 0
    );
  }

  if (
    visible.length &&
    (!selectedCard || selectedCard.hidden)
  ) {
    selectCard(visible[0]);
  }
};

function filterOpportunityCards() {
  const query = (
    searchInput?.value || ''
  ).trim().toLowerCase();

  const location = locationFilter?.value || 'all';

  cards.forEach((card) => {
    const searchableText = [
      card.dataset.role,
      card.dataset.company,
      card.dataset.sector,
      card.dataset.work,
      card.textContent,
    ]
      .join(' ')
      .toLowerCase();

    const matchesQuery =
      !query || searchableText.includes(query);

    const workMode = card.dataset.location || 'all';
    const eligibility = card.dataset.eligibility || 'all';

    const matchesLocation =
      location === 'all' ||
      workMode === location ||
      (
        location === 'flexible' &&
        ['hybrid', 'remote'].includes(workMode)
      ) ||
      (
        location === 'nysc' &&
        eligibility === 'nysc'
      );

    card.hidden = !(
      matchesQuery && matchesLocation
    );
  });

  updateVisibleCount();
}

filterForm?.addEventListener('input', () => {
  if (globalSearch && searchInput) {
    globalSearch.value = searchInput.value;
  }

  document
    .getElementById('clear-opportunity-search')
    ?.classList.toggle(
      'hidden',
      !searchInput?.value
    );

  requestAnimationFrame(filterOpportunityCards);
});

filterForm?.addEventListener('change', () => {
  requestAnimationFrame(filterOpportunityCards);
});

filterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  filterOpportunityCards();
});

globalSearch?.addEventListener('input', () => {
  if (!searchInput) return;

  searchInput.value = globalSearch.value;

  searchInput.dispatchEvent(
    new Event('input', { bubbles: true })
  );
});

document
  .getElementById('global-opportunity-search')
  ?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

document
  .getElementById('clear-opportunity-search')
  ?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (globalSearch) globalSearch.value = '';

    searchInput?.dispatchEvent(
      new Event('input', { bubbles: true })
    );
  });

// =====================================================
// 9. LOCATION FILTER CHIPS
// =====================================================

document
  .querySelectorAll('[data-location-chip]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.locationChip;

      if (locationFilter) {
        locationFilter.value =
          value === 'hybrid' ? 'flexible' : value;
      }

      document
        .querySelectorAll('[data-location-chip]')
        .forEach((item) => {
          const active = item === button;

          item.setAttribute('aria-pressed', String(active));

          item.classList.toggle('bg-[#BF39E8]', active);
          item.classList.toggle('text-white', active);
          item.classList.toggle('bg-[#F5F0FD]', !active);
        });

      locationFilter?.dispatchEvent(
        new Event('change', { bubbles: true })
      );
    });
  });

// =====================================================
// 10. INFORMATION DIALOG
// =====================================================

const dialog = document.getElementById(
  'opportunities-dialog'
);

const showInfo = (heading, message) => {
  if (!dialog) return;

  const title = document.getElementById(
    'opportunities-dialog-title'
  );

  const copy = document.getElementById(
    'opportunities-dialog-copy'
  );

  if (title) title.textContent = heading;
  if (copy) copy.textContent = message;

  if (!dialog.open) {
    dialog.showModal();
  }
};

document
  .querySelectorAll('[data-close-opportunities-dialog]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      dialog?.close();
    });
  });

dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

// =====================================================
// 11. PREPARE LIVE OPPORTUNITY LIST
// =====================================================

if (opportunityList) {
  if (emptyState?.parentElement === opportunityList) {
    opportunityList.after(emptyState);
  }

  opportunityList.replaceChildren();
}

cards = [];
selectedCard = null;

if (resultCount) {
  resultCount.textContent = '0';
}

if (emptyState) {
  emptyState.textContent =
    'Loading live opportunities from your account…';

  emptyState.classList.remove('hidden');
}

const initialRoleBadge = document.querySelector(
  '[data-location-chip="all"]'
);

if (initialRoleBadge) {
  initialRoleBadge.textContent = 'All Roles (0)';
}

const introBadge = document.querySelector(
  'main > section .rounded-full'
);

introBadge?.classList.add('hidden');

const introCopy = document.querySelector(
  'main > section p'
);

if (introCopy) {
  introCopy.textContent =
    'Current vacancies and account-specific match scores are provided by the SkillBridge API.';
}

const sortingLabel = document.querySelector(
  '#opportunity-count'
)?.parentElement?.previousElementSibling;

if (sortingLabel) {
  sortingLabel.textContent = 'Live API opportunities';
}

if (resultCount?.parentElement) {
  resultCount.parentElement.replaceChildren(
    resultCount,
    document.createTextNode(' Live positions')
  );
}

// Initial detail panel
if (detail.company) {
  detail.company.textContent = 'Select an opportunity';
}

if (detail.role) {
  detail.role.textContent =
    'Live listing details will appear here.';
}

if (detail.recruitment) {
  detail.recruitment.textContent = '—';
}

if (detail.closing) {
  detail.closing.textContent = '—';
}

if (detail.sector) {
  detail.sector.textContent = '—';
}

if (detail.team) {
  detail.team.textContent = '—';
}

if (detail.location) {
  detail.location.textContent = '—';
}

if (detail.salary) {
  detail.salary.textContent = 'Compensation not listed';
}

if (detail.fit) {
  detail.fit.textContent = 'No match score';
}

if (detail.rationale) {
  detail.rationale.textContent =
    'Listings and match scores load from the SkillBridge API.';
}

if (detail.apply) {
  detail.apply.href = '#';

  detail.apply.classList.add(
    'pointer-events-none',
    'opacity-50'
  );

  detail.apply.textContent = 'Select a live opportunity';
}

let matchScores = new Map();

// =====================================================
// 12. RENDER OPPORTUNITIES FROM THE API
// =====================================================

const renderApiOpportunities = (opportunities) => {
  if (!Array.isArray(opportunities)) {
    throw new Error(
      'The API returned an invalid opportunities list.'
    );
  }

  opportunityList?.replaceChildren();

  opportunities.forEach((opportunity) => {
    if (!opportunity || typeof opportunity !== 'object') {
      return;
    }

    const opportunityId = String(
      getField(
        opportunity,
        'id',
        'opportunityId',
        'opportunity_id'
      ) || ''
    );

    const match = matchScores.get(opportunityId);

    const title =
      getField(
        opportunity,
        'title',
        'role',
        'jobTitle',
        'job_title',
        'position'
      ) || 'Untitled role';

    const company =
      getField(
        opportunity,
        'company',
        'companyName',
        'company_name',
        'employer',
        'organization'
      ) || 'Company not listed';

    const workMode = getWorkMode(opportunity);

    const location =
      getField(
        opportunity,
        'location',
        'city',
        'locationName',
        'location_name'
      ) || '';

    const category =
      getField(
        opportunity,
        'category',
        'industry',
        'sector',
        'jobCategory',
        'job_category'
      ) || 'Opportunity';

    const opportunityType =
      getField(
        opportunity,
        'type',
        'employmentType',
        'employment_type',
        'jobType',
        'job_type'
      ) || 'Opportunity';

    const deadline = getField(
      opportunity,
      'deadline',
      'applicationDeadline',
      'application_deadline',
      'closingDate',
      'closing_date'
    );

    const salary =
      getField(
        opportunity,
        'salary',
        'salaryRange',
        'salary_range',
        'compensation'
      ) || 'Compensation not listed';

    // Check the opportunity first, then its matching record.
    const applicationUrl =
      getField(
        opportunity,
        'applicationUrl',
        'application_url',
        'applyUrl',
        'apply_url',
        'applicationLink',
        'application_link',
        'applyLink',
        'apply_link'
      ) ||
      getField(
        match,
        'applicationUrl',
        'application_url',
        'applyUrl',
        'apply_url',
        'applicationLink',
        'application_link',
        'applyLink',
        'apply_link'
      ) ||
      '';

    const requiredSkills =
      getField(
        opportunity,
        'requiredSkills',
        'required_skills',
        'skills'
      );

    const matchScore = getMatchScore(match);

    // Read the explanation from either response.
    const matchExplanation =
      getField(
        match,
        'explanation',
        'reason',
        'matchExplanation',
        'match_explanation',
        'why_good_fit',
        'description'
      ) ||
      getField(
        opportunity,
        'explanation',
        'reason',
        'matchExplanation',
        'match_explanation',
        'why_good_fit',
        'description'
      );

    const card = document.createElement('article');

    card.className =
      'opportunity-card cursor-pointer rounded-2xl bg-white p-4 transition hover:shadow-md';

    card.dataset.role = title;
    card.dataset.company = company;
    card.dataset.location = workMode;
    card.dataset.eligibility = 'all';

    card.dataset.fit =
      matchScore === null ? '—' : String(matchScore);

    card.dataset.salary = String(salary);

    card.dataset.work = [
      workModeLabel(workMode),
      location,
    ]
      .filter(Boolean)
      .join(' • ');

    card.dataset.sector = category;
    card.dataset.team = opportunityType;
    card.dataset.close = daysRemaining(deadline);
    card.dataset.recruitment = opportunityId || '—';
    card.dataset.applicationUrl = applicationUrl;
    card.dataset.apiOpportunity = 'true';

    card.dataset.rationale =
      matchExplanation ||
      `Required skills: ${
        Array.isArray(requiredSkills)
          ? requiredSkills.join(', ')
          : 'Not specified'
      }`;

    // Company
    const heading = document.createElement('h2');

    heading.className = 'text-sm font-bold';
    heading.textContent = company;

    // Role
    const role = document.createElement('p');

    role.className =
      'mt-1 text-sm font-semibold text-[#731F94]';

    role.textContent = title;

    // Location and category
    const meta = document.createElement('p');

    meta.className =
      'mt-2 text-[10px] leading-5 text-[#625B6D]';

    meta.textContent = [
      card.dataset.work,
      category,
      opportunityType,
    ]
      .filter(Boolean)
      .join(' • ');

    // Match score
    const matchLabel = document.createElement('span');

    matchLabel.className =
      'mt-2 inline-flex rounded-full bg-[#EEE8FF] px-2 py-1 text-[10px] font-bold text-[#731F94]';

    matchLabel.textContent =
      matchScore === null
        ? 'Match not calculated'
        : `${matchScore}% match`;

    card.append(
      heading,
      role,
      meta,
      matchLabel
    );

    opportunityList?.append(card);
  });

  cards = [
    ...(opportunityList?.querySelectorAll(
      '.opportunity-card'
    ) || []),
  ];

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      selectCard(card);
    });
  });

  selectedCard = cards[0] || null;

  if (selectedCard) {
    selectCard(selectedCard);
  }

  filterOpportunityCards();

  if (!cards.length && emptyState) {
    emptyState.textContent =
      'No active opportunities were returned by the API. Check whether opportunities have been added to the database.';

    emptyState.classList.remove('hidden');
  }
};

// =====================================================
// 13. LOAD OPPORTUNITIES AND MATCHES
// =====================================================

const loadApiOpportunities = async () => {
  if (status) {
    status.classList.remove('sr-only');
    status.textContent = 'Loading live opportunities…';
  }

  if (emptyState) {
    emptyState.textContent =
      'Loading live opportunities from your account…';

    emptyState.classList.remove('hidden');
  }

  try {
    if (!window.SkillBridgeApi.session()) {
      throw new Error(
        'Sign in to load opportunities for your account.'
      );
    }

    const [
      opportunityResult,
      matchResult,
    ] = await Promise.allSettled([
      window.SkillBridgeApi.get(
        '/api/v1/opportunities?page=1&limit=50'
      ),

      window.SkillBridgeApi.get(
        '/api/v1/matching'
      ),
    ]);

    // Opportunities are required for this page.
    if (opportunityResult.status === 'rejected') {
      throw opportunityResult.reason;
    }

    const opportunityResponse =
      window.SkillBridgeApi.unwrap(
        opportunityResult.value
      );

    const opportunities = extractList(
      opportunityResponse
    );

    // Matching is useful but should not prevent listings
    // from displaying if the matching endpoint fails.
    let matchList = [];

    if (matchResult.status === 'fulfilled') {
      const matchResponse =
        window.SkillBridgeApi.unwrap(
          matchResult.value
        );

      matchList = extractList(matchResponse);
    }

    // Build a map using the opportunity ID.
    matchScores = new Map();

    matchList.forEach((item) => {
      const opportunityId = getOpportunityId(item);

      if (opportunityId) {
        matchScores.set(
          opportunityId,
          item
        );
      }
    });

    // Sort by match score, highest first.
    opportunities.sort((a, b) => {
      const aId = String(
        getField(a, 'id', 'opportunityId', 'opportunity_id') || ''
      );

      const bId = String(
        getField(b, 'id', 'opportunityId', 'opportunity_id') || ''
      );

      const aScore = getMatchScore(
        matchScores.get(aId)
      );

      const bScore = getMatchScore(
        matchScores.get(bId)
      );

      return (bScore ?? -1) - (aScore ?? -1);
    });

    renderApiOpportunities(opportunities);

    if (initialRoleBadge) {
      initialRoleBadge.textContent =
        `All Roles (${opportunities.length})`;
    }

    if (introBadge) {
      introBadge.textContent = matchList.length
        ? `${matchList.length} API matches`
        : `${opportunities.length} live listings`;

      introBadge.classList.remove('hidden');
    }

    if (status) {
      if (matchResult.status === 'rejected') {
        status.textContent =
          `${cards.length} opportunities loaded, but match scores could not be fetched.`;
      } else {
        status.textContent =
          `${cards.length} live opportunities loaded from the API.`;
      }
    }
  } catch (error) {
    console.error(
      'Could not load SkillBridge opportunities:',
      error
    );

    const message =
      error?.message ||
      'An unexpected error occurred.';

    if (status) {
      status.classList.remove('sr-only');

      status.textContent =
        `Live opportunities could not be loaded: ${message}`;
    }

    if (emptyState) {
      emptyState.textContent =
        `No live opportunity data is available: ${message}`;

      emptyState.classList.remove('hidden');
    }
  }
};

// =====================================================
// 14. GENERATE / REFRESH MATCHES
// =====================================================

document
  .getElementById('employer-fast-track')
  ?.addEventListener('click', async () => {
    try {
      if (status) {
        status.classList.remove('sr-only');

        status.textContent =
          'Generating profile-based opportunity matches…';
      }

      await window.SkillBridgeApi.post(
        '/api/v1/matching/generate'
      );

      await loadApiOpportunities();

      showInfo(
        'Matches refreshed',
        'Your latest profile-based opportunity matches have been loaded.'
      );
    } catch (error) {
      console.error(
        'Could not generate opportunity matches:',
        error
      );

      showInfo(
        'Could not generate matches',
        error?.message ||
          'Something went wrong while generating matches.'
      );
    }
  });

// =====================================================
// 15. SHARE SELECTED OPPORTUNITY
// =====================================================

document
  .getElementById('detail-share')
  ?.addEventListener('click', async () => {
    if (!selectedCard) {
      showInfo(
        'No opportunity selected',
        'Select an opportunity before sharing it.'
      );

      return;
    }

    const slug = selectedRole()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');

    const url =
      `${window.location.origin}${window.location.pathname}#${encodeURIComponent(slug)}`;

    const shareStatus = document.getElementById(
      'share-status'
    );

    try {
      await navigator.clipboard.writeText(url);

      if (shareStatus) {
        shareStatus.textContent = 'Role link copied';
      }
    } catch {
      if (shareStatus) {
        shareStatus.textContent = url;
      }
    }
  });

// =====================================================
// 16. LOAD THE LIVE DATA
// =====================================================

loadApiOpportunities();