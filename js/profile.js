(() => {
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback = {}) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const user = read('skillbridge_user');
  const surveyRecord = read('skillbridge_survey');
  const survey = surveyRecord.data || {};
  const careers = {
    'fintech-data': 'Junior Fintech Data Analyst',
    backend: 'Associate Backend Engineer',
    growth: 'Growth Product Associate',
  };
  const name = survey.fullName || user.name || 'Candidate';
  const institution = survey.institution || 'Add your institution';
  const formatDegree = ({ degree: qualification, field, classification }) => {
    const rawQualification = String(qualification || 'B.Sc').trim();
    const normalizedQualification = rawQualification.match(/B\.Sc|B\.Eng|B\.A|HND|M\.Sc/i)?.[0]
      || rawQualification.split(/[/(]/)[0].trim()
      || 'B.Sc';
    const normalizedField = String(field || '').trim();
    const normalizedClassification = String(classification || '').split('/')[0].trim();

    // Older locally saved profiles may contain a degree that was already
    // combined with its field and classification. Build one canonical label
    // from its original survey fields so it cannot grow on each edit/reload.
    if (normalizedField || normalizedClassification) {
      return `${normalizedQualification}${normalizedField ? ` ${normalizedField}` : ''}${normalizedClassification ? ` (${normalizedClassification})` : ''}`;
    }
    return rawQualification;
  };
  const degree = formatDegree(survey);
  const location = survey.location || 'Add your location';
  const role = localStorage.getItem('skillbridgeSelectedCareer') || careers[survey.track] || 'Junior Fintech Data Analyst';
  const availabilityMap = { immediate: ['Immediate Placement', 'NYSC status can be added in your survey profile.'], serving: ['Currently Serving', 'Availability details can be updated in your survey profile.'], 'final-year': ['Final Year Student', 'Available after exams'] };
  const [availability, availabilityDetail] = availabilityMap[survey.availability] || ['Immediate Placement', 'Update your availability in career preferences.'];
  const fmt = (value) => `₦${Number(value).toLocaleString('en-NG')}`;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const setField = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  setText('profile-name', name); setText('profile-name-mobile', name); setText('profile-initials', initials);
  const firstName = name.trim().split(/\s+/)[0] || 'Candidate';
  const lastName = name.trim().split(/\s+/).slice(-1)[0] || '';
  setText('profile-topbar-name', `${firstName} ${lastName && lastName !== firstName ? `${lastName[0]}.` : ''}`.trim());
  setText('profile-topbar-track', 'Level 2 Candidate');
  setText('profile-degree', `${degree} • ${institution}`); setText('profile-location', location);
  setText('target-role', role); setText('availability-label', availability); setText('availability-detail', availabilityDetail);

  const low = Number(survey.payMin) || 250000;
  const high = Number(survey.payMax) || 350000;
  setText('salary-range', `${fmt(low)}–${fmt(high)}`);
  setText('salary-bracket', `Your Bracket (${fmt(low / 1000)}k–${fmt(high / 1000)}k)`);
  const fill = $('#salary-fill');
  if (fill) { const start = Math.max(0, Math.min(100, ((low - 150000) / 350000) * 100)); const width = Math.max(3, Math.min(100 - start, ((high - low) / 350000) * 100)); fill.style.marginLeft = `${start}%`; fill.style.width = `${width}%`; }
  const modes = { hybrid: 'Hybrid Lagos (Island / Mainland)', remote: 'Fully Remote', onsite: 'On-Site Victoria Island / Ikoyi' };
  if (survey.workMode && $('#work-model-chips')) $('#work-model-chips').innerHTML = `<span class="inline-flex items-center gap-1 rounded-full bg-[#EEE8FF] px-3 py-1.5 text-[11px]"><i class="ph ph-buildings text-[#731F94]"></i>${modes[survey.workMode] || survey.workMode}</span>`;

  const active = localStorage.getItem('skillbridge_candidate_active') !== 'false';
  const statusButton = $('#candidate-status-toggle');
  const renderActive = () => {
    if (!statusButton) return;
    statusButton.setAttribute('aria-pressed', String(localStorage.getItem('skillbridge_candidate_active') !== 'false'));
    const enabled = statusButton.getAttribute('aria-pressed') === 'true';
    setText('candidate-status-label', enabled ? 'Active Candidate • Open to Hybrid & Remote Offers' : 'Not currently accepting offers');
    const knob = statusButton.querySelector('span');
    if (knob) knob.className = `relative h-5 w-9 rounded-full ${enabled ? 'bg-[#731F94]' : 'bg-[#B8B1C3]'}`;
    const dot = knob?.querySelector('span');
    if (dot) dot.className = `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${enabled ? 'right-0.5' : 'left-0.5'}`;
  };
  renderActive();
  statusButton?.addEventListener('click', () => { localStorage.setItem('skillbridge_candidate_active', String(!(localStorage.getItem('skillbridge_candidate_active') !== 'false'))); renderActive(); });

  const cvName = localStorage.getItem('skillbridgeUploadedCvName');
  if (cvName) {
    setText('active-cv-name', cvName);
    $('#cv-uploaded-state')?.classList.remove('hidden');
    $('#cv-empty-state')?.classList.add('hidden');
    $('#verified-competencies')?.classList.remove('hidden');
  }
  document.querySelectorAll('[data-setting]').forEach((input) => {
    const key = `skillbridgeProfileSetting_${input.dataset.setting}`;
    input.checked = localStorage.getItem(key) === 'true';
    input.addEventListener('change', () => localStorage.setItem(key, String(input.checked)));
  });

  const open = (id) => document.getElementById(id)?.showModal();
  const close = (id) => document.getElementById(id)?.close();
  const announce = (title, message) => { setText('profile-message-title', title); setText('profile-message', message); open('profile-message-dialog'); };
  const sidebar = $('#dashboard-sidebar');
  const sidebarBackdrop = $('#sidebar-backdrop');
  const sidebarButton = $('#dashboard-menu-button');
  const setSidebarOpen = (isOpen) => {
    sidebar?.classList.toggle('-translate-x-full', !isOpen);
    sidebarBackdrop?.classList.toggle('hidden', !isOpen);
    sidebarButton?.setAttribute('aria-expanded', String(isOpen));
    sidebarButton?.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  };
  sidebarButton?.addEventListener('click', () => setSidebarOpen(sidebarButton.getAttribute('aria-expanded') !== 'true'));
  sidebarBackdrop?.addEventListener('click', () => setSidebarOpen(false));
  sidebar?.addEventListener('click', (event) => { if (event.target.closest('a')) setSidebarOpen(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setSidebarOpen(false); });
  $('#profile-search-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = $('#profile-search').value.trim();
    if (query) window.location.href = `opportunities.html?q=${encodeURIComponent(query)}`;
  });
  $('#profile-notifications')?.addEventListener('click', () => announce('Notifications', 'You’re all caught up. Assessment and recruiter updates will appear here.'));
  $('#edit-profile-button')?.addEventListener('click', () => {
    setField('edit-name', name); setField('edit-institution', survey.institution); setField('edit-degree', degree); setField('edit-location', location); open('edit-profile-dialog');
  });
  document.querySelectorAll('[data-close-edit]').forEach((button) => button.addEventListener('click', () => close('edit-profile-dialog')));
  $('#edit-profile-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextName = $('#edit-name').value.trim();
    const nextInstitution = $('#edit-institution').value.trim();
    const nextDegree = $('#edit-degree').value.trim();
    const nextLocation = $('#edit-location').value.trim();
    const nextUser = { ...user, name: nextName };
    const nextSurvey = {
      ...survey,
      fullName: nextName,
      institution: nextInstitution,
      degree: nextDegree,
      field: '',
      classification: '',
      location: nextLocation,
    };
    localStorage.setItem('skillbridge_user', JSON.stringify(nextUser));
    localStorage.setItem('skillbridge_survey', JSON.stringify({ ...surveyRecord, data: nextSurvey }));
    close('edit-profile-dialog'); window.location.reload();
  });

  $('#edit-criteria-button')?.addEventListener('click', () => {
    setField('criteria-role', role); setField('criteria-availability', availability);
    setField('criteria-min-salary', low); setField('criteria-max-salary', high); open('edit-criteria-dialog');
  });
  document.querySelectorAll('[data-close-criteria]').forEach((button) => button.addEventListener('click', () => close('edit-criteria-dialog')));
  $('#edit-criteria-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const min = Number($('#criteria-min-salary').value); const max = Number($('#criteria-max-salary').value);
    if (!min || !max || max <= min) return announce('Check your salary range', 'Maximum salary must be greater than minimum salary.');
    const updated = { ...survey, availability: ({ 'Immediate Placement': 'immediate', 'Currently Serving': 'serving', 'Final Year Student': 'final-year' })[$('#criteria-availability').value], payMin: String(min), payMax: String(max) };
    localStorage.setItem('skillbridge_survey', JSON.stringify({ ...surveyRecord, data: updated }));
    localStorage.setItem('skillbridgeSelectedCareer', $('#criteria-role').value);
    close('edit-criteria-dialog'); window.location.reload();
  });

  $('#share-profile-button')?.addEventListener('click', () => announce('Public profile link', 'A public share URL is not available in this local prototype. Your profile details remain in this browser.'));
  document.querySelectorAll('[data-close-profile-message]').forEach((button) => button.addEventListener('click', () => close('profile-message-dialog')));
  document.querySelectorAll('[data-connection]').forEach((button) => button.addEventListener('click', () => announce(`${button.dataset.connection} connection`, 'Account linking requires a secure authentication provider and is not connected in this prototype.')));
  document.querySelectorAll('[data-close-two-factor]').forEach((button) => button.addEventListener('click', () => close('two-factor-dialog')));
  $('#configure-two-factor')?.addEventListener('click', () => open('two-factor-dialog'));
  $('#logout-devices')?.addEventListener('click', () => {
    if (!window.confirm('Sign out of this browser?')) return;
    localStorage.removeItem('skillbridge_session'); sessionStorage.removeItem('skillbridge_session'); window.location.href = 'signin.html';
  });
  $('#request-deletion')?.addEventListener('click', () => announce('Account deletion', 'Account deletion requests need a secure account service. No profile data was removed.'));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
})();
