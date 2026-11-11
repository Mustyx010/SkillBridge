const careerList = document.getElementById('career-path-list');
const pathForm = document.getElementById('path-search-form');
const pathSearch = document.getElementById('path-search');
const dashboardCta = document.getElementById('dashboard-cta');
const pathStatus = document.getElementById('career-path-status');
const opportunityCount = document.getElementById('career-opportunity-count');
const candidates = [];

const setStatus = (message, isError = false) => {
  pathStatus.textContent = message;
  pathStatus.classList.toggle('text-red-700', isError);
  pathStatus.classList.toggle('text-[#625B6D]', !isError);
};

const listFrom = (value) => {
  if (Array.isArray(value)) return value;
  for (const key of ['items', 'opportunities', 'matches', 'skillGaps', 'results']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const makeText = (tag, className, value) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
};

const normalizeField = (field) => field.replace(/[^a-z]/gi, '').toLowerCase();
const roleFields = new Set([
  'careerPaths', 'careerPathways', 'careerOptions', 'careerRecommendations',
  'recommendedCareers', 'suggestedCareers', 'recommendedRoles', 'suggestedRoles',
  'targetRoles', 'jobTitles', 'recommendedJobTitles', 'suggestedJobTitles',
  'jobRecommendations', 'roles',
].map(normalizeField));

const extractRoleSuggestions = (analysisResult) => {
  const suggestions = [];
  const seen = new Set();
  const visit = (value, roleContext = false) => {
    if (typeof value === 'string') {
      if (roleContext && value.trim()) add(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, roleContext));
      return;
    }
    if (!value || typeof value !== 'object') return;

    if (roleContext) {
      const title = Object.entries(value).find(([key, child]) => (
        ['jobtitle', 'targetjobtitle', 'careertitle', 'role', 'title', 'name', 'label']
          .includes(normalizeField(key))
        && typeof child === 'string'
        && child.trim()
      ))?.[1];
      if (title) {
        add(title.trim(), value);
        return;
      }
    }
    Object.entries(value).forEach(([key, child]) => {
      if (roleFields.has(normalizeField(key))) visit(child, true);
      else if (!roleContext && child && typeof child === 'object') visit(child);
    });
  };
  const add = (title, details = {}) => {
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ title, details, source: 'CV recommendation' });
  };

  visit(analysisResult);
  return suggestions;
};

const extractSkills = (...sources) => {
  const skills = new Set();
  const skillFields = new Set([
    'currentSkills', 'extractedSkills', 'skills', 'technicalSkills',
    'competencies', 'skillsFound', 'matchedSkills',
  ].map(normalizeField));
  const visit = (value, inSkillField = false) => {
    if (typeof value === 'string') {
      if (inSkillField && value.trim()) skills.add(value.trim().toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, inSkillField));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (inSkillField) {
      const skill = Object.entries(value).find(([key, child]) => (
        ['skill', 'name', 'label'].includes(normalizeField(key))
        && typeof child === 'string'
        && child.trim()
      ))?.[1];
      if (typeof skill === 'string' && skill.trim()) skills.add(skill.trim().toLowerCase());
      return;
    }
    Object.entries(value).forEach(([key, child]) => {
      visit(child, inSkillField || skillFields.has(normalizeField(key)));
    });
  };
  sources.forEach((source) => visit(source));
  return skills;
};

const normalizeSkill = (skill) => String(skill || '').trim().toLowerCase();

const addCareerCard = (candidate, index) => {
  const card = document.createElement('article');
  card.className = 'career-card rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(24,20,69,0.08)] sm:p-8';
  card.dataset.role = candidate.title;
  const content = document.createElement('div');
  content.className = 'grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]';
  const description = document.createElement('div');
  const rank = makeText('span', 'rounded-full bg-[#F2E8FA] px-2.5 py-1 text-[10px] font-semibold text-[#8527A1]',
    candidate.match ? `Rank #${index + 1} • API-verified match` : 'CV recommendation');
  const source = makeText('span', 'rounded-full bg-[#EEE8FF] px-2.5 py-1 text-[10px] font-semibold text-[#4A4455]', candidate.source);
  const badges = document.createElement('div');
  badges.className = 'flex flex-wrap gap-1.5';
  badges.append(rank, source);
  description.append(badges, makeText('h2', 'mt-4 text-xl font-bold', candidate.title));

  const opportunity = candidate.opportunity;
  if (opportunity) {
    const details = [opportunity.company, opportunity.workMode, opportunity.location].filter(Boolean).join(' • ');
    if (details) description.append(makeText('p', 'mt-2 text-sm text-[#625B6D]', details));
    if (opportunity.requiredSkills?.length) {
      description.append(makeText('p', 'mt-3 text-xs leading-5 text-[#625B6D]', `Required skills: ${opportunity.requiredSkills.join(', ')}`));
    }
    const match = candidate.match;
    if (match?.explanation) {
      description.append(makeText('p', 'mt-4 rounded-lg bg-[#F5F0FD] p-4 text-xs leading-5 text-[#4A4455]', `Why this matches: ${match.explanation}`));
    } else if (candidate.overlap?.length) {
      description.append(makeText('p', 'mt-3 rounded-lg bg-[#F5F0FD] p-3 text-xs leading-5 text-[#625B6D]', `CV skills matching this opportunity: ${candidate.overlap.join(', ')}`));
    }
    if (opportunity.applicationUrl) {
      try {
        const applicationUrl = new URL(opportunity.applicationUrl);
        if (['http:', 'https:'].includes(applicationUrl.protocol)) {
          const link = makeText('a', 'mt-3 inline-block text-xs font-semibold text-[#731F94] underline', 'View opportunity');
          link.href = applicationUrl.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          description.append(link);
        }
      } catch {
        setStatus(`The API returned an invalid application link for ${candidate.title}.`, true);
      }
    }
  } else {
    const rationale = candidate.details?.reason || candidate.details?.rationale || candidate.details?.description;
    if (typeof rationale === 'string' && rationale.trim()) {
      description.append(makeText('p', 'mt-3 text-sm leading-5 text-[#625B6D]', rationale.trim()));
    }
  }

  const actionPanel = document.createElement('div');
  actionPanel.className = 'rounded-xl bg-[#F5F0FD] p-5';
  if (candidate.match && Number.isFinite(candidate.match.matchPercentage)) {
    const score = Math.max(0, Math.min(100, candidate.match.matchPercentage));
    const calibration = makeText('p', 'text-[10px] font-bold uppercase tracking-wide text-[#81798B]', 'Match calibration');
    const percentage = document.createElement('p');
    percentage.className = 'mt-1';
    percentage.append(makeText('strong', 'text-5xl font-extrabold text-[#8527A1]', `${score}%`), makeText('span', 'ml-1 text-xs', 'Fit'));
    const factor = makeText('p', 'mt-4 flex justify-between text-[10px] font-medium', `${(candidate.match.matchedSkills || candidate.overlap || []).length} verified matching skill${(candidate.match.matchedSkills || candidate.overlap || []).length === 1 ? '' : 's'}`);
    const progress = document.createElement('div');
    progress.className = 'mt-1 h-2 overflow-hidden rounded-full bg-[#E5DDFA]';
    const fill = document.createElement('div');
    fill.className = 'h-full bg-[#8527A1]';
    fill.style.width = `${score}%`;
    progress.append(fill);
    actionPanel.append(calibration, percentage, factor, progress);
    const chips = document.createElement('div');
    chips.className = 'mt-3 flex flex-wrap gap-1 text-[10px]';
    (candidate.match.matchedSkills || candidate.overlap || []).slice(0, 4).forEach((skill) => chips.append(makeText('span', 'rounded-full bg-[#EAE2FF] px-2 py-1 text-[#8527A1]', skill)));
    (candidate.match.missingSkills || []).slice(0, 2).forEach((skill) => chips.append(makeText('span', 'rounded-full bg-white px-2 py-1 text-[#81798B]', `Develop: ${skill}`)));
    if (chips.childElementCount) actionPanel.append(chips);
  } else if (candidate.overlap?.length) {
    actionPanel.append(makeText('p', 'text-xs font-semibold text-[#8527A1]', `${candidate.overlap.length} matching CV skill${candidate.overlap.length === 1 ? '' : 's'}`));
  } else {
    actionPanel.append(makeText('p', 'text-xs text-[#625B6D]', 'Recommended by your CV analysis'));
  }
  const select = makeText('button', 'select-path mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#8527A1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6E2186]', 'Select & Build Roadmap');
  select.type = 'button';
  select.dataset.candidateIndex = String(index);
  actionPanel.append(select);
  content.append(description, actionPanel);
  card.append(content);
  careerList.append(card);
};

const applySearch = () => {
  const query = pathSearch.value.trim().toLowerCase();
  const cards = [...careerList.querySelectorAll('.career-card')];
  let visible = 0;
  cards.forEach((card) => {
    const show = !query || card.textContent.toLowerCase().includes(query);
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (query && !visible) setStatus('No CV recommendation or opportunity matches that search.');
};

pathForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applySearch();
});
pathSearch.addEventListener('input', applySearch);

careerList.addEventListener('click', async (event) => {
  const button = event.target.closest('.select-path');
  if (!button) return;
  const candidate = candidates[Number(button.dataset.candidateIndex)];
  if (!candidate) return;

  const stopLoading = window.SkillBridgeApi.setLoading(button, 'Saving career goal…');
  setStatus(`Generating a skill-gap analysis for ${candidate.title}…`);
  try {
    const survey = (() => {
      try { return JSON.parse(localStorage.getItem('skillbridge_survey') || '{}').data || {}; }
      catch { return {}; }
    })();
    const careerStage = survey.availability === 'final-year' ? 'Student' : 'Entry';
    const cvId = localStorage.getItem('skillbridgeUploadedCvId');
    if (!cvId) throw new Error('Your uploaded CV could not be identified. Return to CV upload and try again.');

    const analysis = window.SkillBridgeApi.unwrap(await window.SkillBridgeApi.post(
      `/api/v1/cvs/${encodeURIComponent(cvId)}/analyze`,
      {
        targetJobTitle: candidate.title,
        industryFocus: survey.track === 'fintech-data' ? 'Financial Technology' : 'Technology',
        careerStage,
        primaryGoal: 'Gap Analysis',
      },
    ));
    if (!analysis?.skillGapId) throw new Error('The API response did not include a skill-gap analysis ID.');
    const artifactResults = await window.SkillBridgeApi.refreshAnalysisArtifacts({
      skillGapId: analysis.skillGapId,
      careerGoal: candidate.title,
      includeRoadmap: true,
    });

    localStorage.setItem('skillbridgeSkillGapId', analysis.skillGapId);
    localStorage.setItem('skillbridgeSelectedCareer', candidate.title);
    window.SkillBridgeApi.setAnalysisContext({ skillGapId: analysis.skillGapId, careerGoal: candidate.title });
    dashboardCta.setAttribute('aria-disabled', 'false');
    dashboardCta.classList.remove('pointer-events-none', 'opacity-50');
    const matchUpdated = artifactResults.find((result) => result.name === 'matches')?.ok;
    const roadmapUpdated = artifactResults.find((result) => result.name === 'roadmap')?.ok;
    setStatus(`${candidate.title} is saved. Your skill gap and profile are updated${matchUpdated ? ', along with your job matches' : ''}${roadmapUpdated ? ' and roadmap' : ''}. Continue to your dashboard.`);
  } catch (error) {
    setStatus(`Could not save this career goal: ${error.message}`, true);
  } finally {
    stopLoading();
  }
});

const loadCareerOptions = async () => {
  careerList.replaceChildren(makeText('p', 'rounded-xl bg-white p-5 text-sm text-[#625B6D]', 'Loading your CV analysis and matching opportunities…'));
  careerList.hidden = false;
  if (!window.SkillBridgeApi.session()) {
    if (opportunityCount) opportunityCount.textContent = '—';
    careerList.replaceChildren(makeText('p', 'rounded-xl bg-white p-5 text-sm text-[#625B6D]', 'Sign in to view career options based on your CV.'));
    setStatus('Your CV-based recommendations are available after you sign in.', true);
    return;
  }

  try {
    let cvId = localStorage.getItem('skillbridgeUploadedCvId');
    if (!cvId) {
      const cvs = listFrom(window.SkillBridgeApi.unwrap(await window.SkillBridgeApi.get('/api/v1/cvs/my-cvs')));
      const latestCv = [...cvs].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))[0];
      cvId = latestCv?.id;
      if (cvId) localStorage.setItem('skillbridgeUploadedCvId', cvId);
    }
    if (!cvId) throw new Error('No uploaded CV was found. Complete the survey and upload your CV to continue.');

    // Saved matches are not created by a GET. Generate them first so a CV
    // analysis immediately has job-match cards, including on a fresh account.
    const matchingRefresh = await window.SkillBridgeApi.refreshAnalysisArtifacts();
    const results = await Promise.allSettled([
      window.SkillBridgeApi.get(`/api/v1/cvs/${encodeURIComponent(cvId)}/analysis`),
      window.SkillBridgeApi.get('/api/v1/skill-gaps'),
      window.SkillBridgeApi.get('/api/v1/opportunities'),
      window.SkillBridgeApi.get('/api/v1/matching'),
    ]);
    const analysis = results[0].status === 'fulfilled' ? window.SkillBridgeApi.unwrap(results[0].value) : null;
    const gaps = results[1].status === 'fulfilled' ? listFrom(window.SkillBridgeApi.unwrap(results[1].value)) : [];
    const opportunities = results[2].status === 'fulfilled' ? listFrom(window.SkillBridgeApi.unwrap(results[2].value)) : [];
    const matches = results[3].status === 'fulfilled' ? listFrom(window.SkillBridgeApi.unwrap(results[3].value)) : [];
    const sourceErrors = results.flatMap((result, index) => (
      result.status === 'rejected'
        ? [`${['CV analysis', 'skill gaps', 'opportunities', 'job matches'][index]}: ${result.reason?.message || 'request failed'}`]
        : []
    ));
    if (!matchingRefresh.find((result) => result.name === 'matches')?.ok) {
      sourceErrors.push('job match generation: the API could not refresh matches');
    }
    const skillGap = gaps.find((gap) => gap.cvId === cvId)
      || gaps.find((gap) => gap.id === localStorage.getItem('skillbridgeSkillGapId'));
    const analysisResult = analysis?.analysisResult || {};
    const skills = extractSkills(analysisResult, skillGap);
    const recommendations = extractRoleSuggestions(analysisResult);
    const matchByOpportunityId = new Map(matches.map((match) => [
      match.opportunityId || match.opportunity?.id,
      match,
    ]));
    const activeOpportunities = opportunities.filter((item) => !item.status || item.status === 'active');
    const matchedOpportunities = activeOpportunities.map((opportunity) => {
      const match = matchByOpportunityId.get(opportunity.id);
      const requiredSkills = [...(opportunity.requiredSkills || []), ...(opportunity.preferredSkills || [])];
      const overlap = requiredSkills.filter((skill) => skills.has(normalizeSkill(skill)));
      return { opportunity, match, overlap };
    }).filter((item) => item.match || item.overlap.length);

    const combined = [...recommendations];
    matchedOpportunities
      .sort((a, b) => {
        const scoreA = Number.isFinite(a.match?.matchPercentage) ? a.match.matchPercentage : 0;
        const scoreB = Number.isFinite(b.match?.matchPercentage) ? b.match.matchPercentage : 0;
        return scoreB - scoreA || b.overlap.length - a.overlap.length;
      })
      .forEach(({ opportunity, match, overlap }) => {
        const existing = combined.find((item) => item.title.toLowerCase() === opportunity.title?.toLowerCase());
        if (existing) {
          existing.opportunity = opportunity;
          existing.match = match;
          existing.overlap = overlap;
          existing.source = 'CV-matched opportunity';
        } else {
          combined.push({ title: opportunity.title, opportunity, match, overlap, source: 'CV-matched opportunity' });
        }
      });

    candidates.splice(0, candidates.length, ...combined.filter((item) => item.title));
    careerList.replaceChildren();
    if (opportunityCount) opportunityCount.textContent = String(matchedOpportunities.length);
    if (!candidates.length) {
      careerList.append(makeText(
        'p',
        'rounded-xl bg-white p-5 text-sm leading-6 text-[#625B6D]',
        analysis
          ? 'Your CV analysis did not return career recommendations, and no active opportunity matched the skills in the analysis. You can update your survey or upload a revised CV to try again.'
          : `CV analysis could not be loaded: ${results[0].status === 'rejected' ? results[0].reason.message : 'No analysis was returned.'}`,
      ));
      setStatus(sourceErrors.length
        ? `Some API data could not be loaded: ${sourceErrors.join('; ')}`
        : '');
      return;
    }

    candidates.forEach(addCareerCard);
    const previouslySelected = localStorage.getItem('skillbridgeSelectedCareer');
    if (previouslySelected && localStorage.getItem('skillbridgeSkillGapId')) {
      dashboardCta.setAttribute('aria-disabled', 'false');
      dashboardCta.classList.remove('pointer-events-none', 'opacity-50');
    }
    setStatus(sourceErrors.length
      ? `Some API data could not be loaded: ${sourceErrors.join('; ')}`
      : `${candidates.length} CV-derived career option${candidates.length === 1 ? '' : 's'} found.`);
  } catch (error) {
    careerList.replaceChildren(makeText('p', 'rounded-xl bg-white p-5 text-sm text-[#625B6D]', error.message));
    if (opportunityCount) opportunityCount.textContent = '—';
    setStatus(error.message, true);
  }
};

loadCareerOptions();
