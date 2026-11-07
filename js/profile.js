(() => {
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback = {}) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  let user = read('skillbridge_user');
  let surveyRecord = read('skillbridge_survey');
  let survey = surveyRecord.data || {};
  let name = user.name || survey.fullName || 'Candidate';
  let institution = survey.institution || 'Add your institution';
  let education = '';
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
  let degree = formatDegree(survey);
  let location = survey.location || 'Add your location';
  let pendingProfileSync = read('skillbridge_profile_pending_sync', null);
  if (pendingProfileSync) {
    name = pendingProfileSync.fullName || name;
    institution = pendingProfileSync.institution || institution;
    degree = pendingProfileSync.degree || degree;
    location = pendingProfileSync.location || location;
    education = pendingProfileSync.education || '';
    survey = { ...survey, fullName: name, institution, degree, location };
  }
  let role = localStorage.getItem('skillbridgeSelectedCareer') || survey.careerGoal || 'Not selected yet';
  const availabilityMap = { immediate: ['Immediate Placement', 'NYSC status can be added in your survey profile.'], serving: ['Currently Serving', 'Availability details can be updated in your survey profile.'], 'final-year': ['Final Year Student', 'Available after exams'] };
  const [availability, availabilityDetail] = availabilityMap[survey.availability] || ['Not set', 'Complete your survey to set your availability.'];
  const fmt = (value) => `₦${Number(value).toLocaleString('en-NG')}`;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const setField = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  const setCareerGoalField = (value) => {
    const select = $('#criteria-role');
    if (!select) return;
    if (![...select.options].some((option) => option.value === value || option.textContent === value)) {
      select.add(new Option(value, value));
    }
    select.value = value;
  };
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  setText('profile-name', name); setText('profile-name-mobile', name); setText('profile-initials', initials);
  const firstName = name.trim().split(/\s+/)[0] || 'Candidate';
  const lastName = name.trim().split(/\s+/).slice(-1)[0] || '';
  setText('profile-topbar-name', `${firstName} ${lastName && lastName !== firstName ? `${lastName[0]}.` : ''}`.trim());
  setText('profile-topbar-track', 'Level 2 Candidate');
  const renderProfileDetails = () => {
    setText('profile-name', name);
    setText('profile-name-mobile', name);
    setText('profile-initials', name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join(''));
    const first = name.trim().split(/\s+/)[0] || 'Candidate';
    const last = name.trim().split(/\s+/).slice(-1)[0] || '';
    setText('profile-topbar-name', `${first} ${last && last !== first ? `${last[0]}.` : ''}`.trim());
    setText('profile-degree', education || `${formatDegree(survey)} • ${institution}`);
    setText('profile-location', location);
  };
  renderProfileDetails();
  setText('target-role', role); setText('availability-label', availability); setText('availability-detail', availabilityDetail);

  const low = Number(survey.payMin);
  const high = Number(survey.payMax);
  setText('salary-range', low && high ? `${fmt(low)}–${fmt(high)}` : 'Not specified');
  setText('salary-bracket', low && high ? `Your Bracket (${fmt(low / 1000)}k–${fmt(high / 1000)}k)` : 'Salary preference not specified');
  const fill = $('#salary-fill');
  if (fill) {
    if (low && high) {
      const start = Math.max(0, Math.min(100, ((low - 150000) / 350000) * 100));
      const width = Math.max(3, Math.min(100 - start, ((high - low) / 350000) * 100));
      fill.style.marginLeft = `${start}%`;
      fill.style.width = `${width}%`;
    } else {
      fill.style.width = '0%';
    }
  }
  const modes = { hybrid: 'Hybrid Lagos (Island / Mainland)', remote: 'Fully Remote', onsite: 'On-Site Victoria Island / Ikoyi' };
  if ($('#work-model-chips')) {
    if (survey.workMode) {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-1 rounded-full bg-[#EEE8FF] px-3 py-1.5 text-[11px]';
      const icon = document.createElement('i');
      icon.className = 'ph ph-buildings text-[#731F94]';
      chip.append(icon, document.createTextNode(modes[survey.workMode] || survey.workMode));
      $('#work-model-chips').replaceChildren(chip);
    } else {
      $('#work-model-chips').replaceChildren();
    }
  }

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
  setField('edit-name', name); setField('edit-institution', institution); setField('edit-degree', degree); setField('edit-location', location); open('edit-profile-dialog');
  });
  document.querySelectorAll('[data-close-edit]').forEach((button) => button.addEventListener('click', () => close('edit-profile-dialog')));
  $('#edit-profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextName = $('#edit-name').value.trim();
    const nextInstitution = $('#edit-institution').value.trim();
    const nextDegree = $('#edit-degree').value.trim();
    const nextLocation = $('#edit-location').value.trim();
    const form = $('#edit-profile-form');
    const status = $('#edit-profile-status');
    const submitButton = form.querySelector('[type="submit"]');
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
    submitButton.disabled = true;
    status.classList.remove('hidden', 'text-red-700');
    status.textContent = 'Saving your profile…';
    pendingProfileSync = {
      fullName: nextName,
      institution: nextInstitution,
      degree: nextDegree,
      location: nextLocation,
      education: [nextDegree, nextInstitution].filter(Boolean).join(' - '),
    };
    surveyRecord = { ...surveyRecord, data: nextSurvey };
    survey = nextSurvey;
    name = nextName;
    institution = nextInstitution || 'Add your institution';
    degree = nextDegree || 'B.Sc';
    location = nextLocation || 'Add your location';
    education = pendingProfileSync.education;
    localStorage.setItem('skillbridge_user', JSON.stringify(nextUser));
    localStorage.setItem('skillbridge_survey', JSON.stringify(surveyRecord));
    localStorage.setItem('skillbridge_profile_pending_sync', JSON.stringify(pendingProfileSync));
    renderProfileDetails();
    if (!window.SkillBridgeApi.session()?.token) {
      status.textContent = 'Saved on this device. Sign in to sync these changes with your account.';
      submitButton.disabled = false;
      return;
    }

    const [profileResult, userResult] = await Promise.allSettled([
      window.SkillBridgeApi.put('/api/v1/profiles/me', {
        location: nextLocation || null,
        education: [nextDegree, nextInstitution].filter(Boolean).join(' - ') || null,
      }),
      window.SkillBridgeApi.put('/api/v1/users/me', { fullName: nextName }),
    ]);

    if (userResult.status === 'fulfilled') user = nextUser;

    const failures = [
      profileResult.status === 'rejected' ? `Profile details: ${profileResult.reason.message}` : '',
      userResult.status === 'rejected' ? `Name: ${userResult.reason.message}` : '',
    ].filter(Boolean);
    if (failures.length) {
      status.classList.add('text-red-700');
      status.textContent = `Saved on this device; account sync is pending. ${failures.join(' ')}`;
    } else {
      localStorage.removeItem('skillbridge_profile_pending_sync');
      pendingProfileSync = null;
      close('edit-profile-dialog');
    }
    submitButton.disabled = false;
  });

  $('#edit-criteria-button')?.addEventListener('click', () => {
    setCareerGoalField(role); setField('criteria-availability', availability);
    setField('criteria-min-salary', low); setField('criteria-max-salary', high); open('edit-criteria-dialog');
  });
  document.querySelectorAll('[data-close-criteria]').forEach((button) => button.addEventListener('click', () => close('edit-criteria-dialog')));
  $('#edit-criteria-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const min = Number($('#criteria-min-salary').value); const max = Number($('#criteria-max-salary').value);
    if (!min || !max || max <= min) return announce('Check your salary range', 'Maximum salary must be greater than minimum salary.');
    const form = $('#edit-criteria-form');
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const careerGoal = $('#criteria-role').value;
      await window.SkillBridgeApi.put('/api/v1/profiles/me', { careerGoal });
      role = careerGoal;
      localStorage.setItem('skillbridgeSelectedCareer', careerGoal);
      setText('target-role', careerGoal);
      close('edit-criteria-dialog');
      announce('Career goal saved', 'The career goal synced to your account. Availability and salary changes were not saved because the documented profile API does not include those fields.');
    } catch (error) {
      announce('Preferences could not be saved', error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  $('#share-profile-button')?.addEventListener('click', () => announce('Public profile link', 'A public share URL is not available in this local prototype. Your profile details remain in this browser.'));
  document.querySelectorAll('[data-close-profile-message]').forEach((button) => button.addEventListener('click', () => close('profile-message-dialog')));
  document.querySelectorAll('[data-connection]').forEach((button) => button.addEventListener('click', () => announce(`${button.dataset.connection} connection`, 'Account linking requires a secure authentication provider and is not connected in this prototype.')));
  document.querySelectorAll('[data-close-two-factor]').forEach((button) => button.addEventListener('click', () => close('two-factor-dialog')));
  $('#configure-two-factor')?.addEventListener('click', () => open('two-factor-dialog'));
  $('#logout-devices')?.addEventListener('click', () => {
    if (!window.confirm('Sign out of this browser?')) return;
    window.SkillBridgeApi.clearSession(); window.location.href = 'signin.html';
  });
  $('#request-deletion')?.addEventListener('click', () => announce('Account deletion', 'Account deletion requests need a secure account service. No profile data was removed.'));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));

  const activeSession = window.SkillBridgeApi.session();
  if (!activeSession?.token) {
    const profileHeading = document.getElementById('profile-name');
    const signInNotice = document.createElement('p');
    signInNotice.className = 'mt-3 text-sm text-[#625B6D]';
    signInNotice.setAttribute('role', 'status');
    signInNotice.append('Sign in to load and sync your profile. ');
    const signInLink = document.createElement('a');
    signInLink.href = 'signin.html';
    signInLink.className = 'font-semibold text-[#731F94] underline';
    signInLink.textContent = 'Sign in to sync your profile';
    signInNotice.append(signInLink, '.');
    profileHeading?.insertAdjacentElement('afterend', signInNotice);
  } else if (activeSession?.token) {
    const syncPendingProfile = async () => {
      if (!pendingProfileSync) return;
      const results = await Promise.allSettled([
        window.SkillBridgeApi.put('/api/v1/profiles/me', {
          location: pendingProfileSync.location || null,
          education: pendingProfileSync.education || null,
        }),
        window.SkillBridgeApi.put('/api/v1/users/me', { fullName: pendingProfileSync.fullName }),
      ]);
      if (results.every((result) => result.status === 'fulfilled')) {
        localStorage.removeItem('skillbridge_profile_pending_sync');
        pendingProfileSync = null;
      } else {
        const failures = results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason.message);
        window.SkillBridgeApi.showStatus('profile-name', `Profile changes remain saved on this device; account sync is still pending: ${failures.join(' ')}`, true);
      }
    };
    syncPendingProfile()
      .then(() => window.SkillBridgeApi.get('/api/v1/profiles/me'))
      .then(async (response) => {
        const account = window.SkillBridgeApi.unwrap(response);
        const remoteProfile = account?.profile;
        if (!pendingProfileSync && account?.fullName) {
          name = account.fullName;
          user.name = account.fullName;
          user.email = account.email || user.email;
          localStorage.setItem('skillbridge_user', JSON.stringify(user));
          renderProfileDetails();
        }
        if (!pendingProfileSync && remoteProfile?.location) location = remoteProfile.location;
        if (!pendingProfileSync && remoteProfile?.education) {
          education = remoteProfile.education;
          const parts = remoteProfile.education.split(/\s+-\s+/);
          degree = parts.shift() || degree;
          institution = parts.join(' - ') || institution;
        }
        if (!pendingProfileSync && (remoteProfile?.location || remoteProfile?.education || account?.fullName)) renderProfileDetails();
        if (!pendingProfileSync && remoteProfile?.careerGoal) {
          role = remoteProfile.careerGoal;
          localStorage.setItem('skillbridgeSelectedCareer', role);
          setText('target-role', role);
        }
        try {
          const result = await window.SkillBridgeApi.get('/api/v1/cvs/my-cvs');
          const cvs = window.SkillBridgeApi.unwrap(result);
          const items = Array.isArray(cvs) ? cvs : cvs?.items || [];
          const latest = [...items].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))[0];
          if (latest?.fileName) {
            localStorage.setItem('skillbridgeUploadedCvId', latest.id);
            localStorage.setItem('skillbridgeUploadedCvName', latest.fileName);
            setText('active-cv-name', latest.fileName);
            $('#cv-uploaded-state')?.classList.remove('hidden');
            $('#cv-empty-state')?.classList.add('hidden');
            $('#verified-competencies')?.classList.add('hidden');
          }
        } catch (error) {
          window.SkillBridgeApi.showStatus('active-cv-name', `CV records could not be refreshed: ${error.message}`, true);
        }
      })
      .catch((error) => {
        window.SkillBridgeApi.showStatus('profile-name', `Profile data could not be refreshed: ${error.message}`, true);
      });
  }
})();
