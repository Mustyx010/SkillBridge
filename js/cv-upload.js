
const fileInput = document.getElementById('cv-file');
const uploadZone = document.getElementById('upload-zone');
const browseButton = document.getElementById('browse-files');
const uploadError = document.getElementById('upload-error');
const uploadedPanel = document.getElementById('uploaded-file-panel');
const fileName = document.getElementById('uploaded-file-heading');
const parsePercent = document.getElementById('parse-percent');
const parseProgress = document.getElementById('parse-progress');
const parseProgressLabel = document.getElementById('parse-progress-label');
const uploadStatus = document.getElementById('upload-status');
const continueButton = document.getElementById('continue-button');
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const compressorDialog = document.getElementById('compress-dialog');

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let uploadedCvId = localStorage.getItem('skillbridgeUploadedCvId');
let existingSkillGap = null;
let currentUpload = null;
let uploadPromise = null;

// =====================================================
// 1. UPLOAD AND ANALYSIS PROGRESS
// =====================================================

function setAnalysisProgress(percent, label, indeterminate = false) {
  parsePercent.textContent = indeterminate
    ? 'Analysis in progress'
    : `${percent}% uploaded`;

  parseProgressLabel.textContent = label;
  parseProgress.style.width = `${indeterminate ? 36 : percent}%`;

  parseProgress.classList.toggle('animate-pulse', indeterminate);

  parseProgress.setAttribute(
    'aria-label',
    indeterminate ? 'CV analysis progress' : 'CV upload progress',
  );

  if (indeterminate) {
    parseProgress.removeAttribute('aria-valuenow');
    parseProgress.setAttribute('aria-valuetext', label);
  } else {
    parseProgress.setAttribute('aria-valuenow', String(percent));
    parseProgress.removeAttribute('aria-valuetext');
  }
}

// =====================================================
// 2. API RESPONSE HELPERS
// =====================================================

function listFrom(value, keys = []) {
  if (Array.isArray(value)) return value;

  for (const key of keys) {
    if (Array.isArray(value?.[key])) {
      return value[key];
    }
  }

  return null;
}

// A saved analysis can be reused only while it still matches what the user
// says now. Older analyses (no stored industry or stage) are reused as before.
function isAnalysisCurrent(gap, profile) {
  const same = (a, b) =>
    String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  if (profile.targetRole && !same(gap.targetJobTitle, profile.targetRole)) return false;
  if (gap.industryFocus && profile.industryFocus && !same(gap.industryFocus, profile.industryFocus)) return false;
  if (gap.careerStage && profile.careerStage && gap.careerStage !== profile.careerStage) return false;

  return true;
}

// =====================================================
// 3. DISPLAY SAVED CV
// =====================================================

function showSavedCv(cv, skillGaps) {
  uploadedCvId = cv.id;

  localStorage.setItem('skillbridgeUploadedCvId', cv.id);
  localStorage.setItem(
    'skillbridgeUploadedCvName',
    cv.fileName || 'Uploaded CV',
  );

  fileName.textContent = cv.fileName || 'Uploaded CV';

  const sizeLabel = fileName.parentElement.querySelector('span');

  if (sizeLabel && Number.isFinite(cv.fileSize) && cv.fileSize > 0) {
    sizeLabel.textContent = formatFileSize(cv.fileSize);
  } else if (sizeLabel) {
    sizeLabel.textContent = 'Saved to your account';
  }

  uploadedPanel.classList.remove('hidden');

  // Find a completed analysis belonging to this CV only.
  existingSkillGap = skillGaps
    .filter(
      (gap) =>
        gap.cvId === cv.id &&
        gap.status === 'completed',
    )
    .sort(
      (a, b) =>
        Date.parse(b.updatedAt || b.createdAt || 0) -
        Date.parse(a.updatedAt || a.createdAt || 0),
    )[0] || null;

  if (existingSkillGap) {
    localStorage.setItem(
      'skillbridgeSkillGapId',
      existingSkillGap.id,
    );

    setAnalysisProgress(100, 'Analysis complete');

    uploadStatus.textContent =
      'Your saved CV has an API analysis and is ready to continue.';
  } else {
    setAnalysisProgress(0, 'Ready to analyze');
  }

  setContinueState(true);
}

// =====================================================
// 4. LOAD SAVED CVS FROM THE BACKEND
// =====================================================

async function loadSavedCv() {
  if (!window.SkillBridgeApi.session()) return;

  const [cvResult, gapsResult] = await Promise.allSettled([
    window.SkillBridgeApi.get('/api/v1/cvs/my-cvs'),
    window.SkillBridgeApi.get('/api/v1/skill-gaps'),
  ]);

  if (cvResult.status === 'rejected') {
    uploadError.textContent =
      `Your saved CVs could not be loaded: ${cvResult.reason.message}`;

    uploadError.classList.remove('hidden');
    return;
  }

  const cvs = listFrom(
    window.SkillBridgeApi.unwrap(cvResult.value),
    ['items', 'cvs'],
  );

  if (!cvs) {
    throw new Error('The API returned an invalid saved CV list.');
  }

  const skillGaps =
    gapsResult.status === 'fulfilled'
      ? listFrom(
          window.SkillBridgeApi.unwrap(gapsResult.value),
          ['items', 'skillGaps'],
        )
      : [];

  if (!skillGaps) {
    throw new Error('The API returned an invalid skill-gap list.');
  }

  if (gapsResult.status === 'rejected') {
    uploadError.textContent =
      `Your saved CV is available, but its analysis status could not be checked: ${gapsResult.reason.message}`;

    uploadError.classList.remove('hidden');
  }

  const preferredId = localStorage.getItem(
    'skillbridgeUploadedCvId',
  );

  if (!cvs.length) {
    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');
    return;
  }

  const cv =
    cvs.find((item) => item.id === preferredId) ||
    [...cvs].sort(
      (a, b) =>
        Date.parse(b.createdAt || 0) -
        Date.parse(a.createdAt || 0),
    )[0];

  if (!cv || currentUpload) return;

  showSavedCv(cv, skillGaps);
}

// =====================================================
// 5. CONTINUE BUTTON STATE
// =====================================================

function setContinueState(ready) {
  continueButton.setAttribute(
    'aria-disabled',
    String(!ready),
  );

  continueButton.classList.toggle(
    'pointer-events-none',
    !ready,
  );

  continueButton.classList.toggle(
    'opacity-50',
    !ready,
  );

  if (!ready) {
    uploadStatus.innerHTML =
      '<span class="h-3 w-3 rounded-full bg-[#81798B]"></span><span>Upload a CV or academic dossier to continue</span>';
  }
}

// =====================================================
// 6. SELECT AND VALIDATE CV FILE
// =====================================================

function showFile(file) {
  uploadError.textContent = '';
  uploadError.classList.add('hidden');

  if (!file) return;

  if (!window.SkillBridgeApi.session()) {
    const signInLink = document.createElement('a');

    signInLink.href = 'signin.html';
    signInLink.className = 'font-bold underline';
    signInLink.textContent = 'Sign in';

    uploadError.replaceChildren(
      document.createTextNode('You need to '),
      signInLink,
      document.createTextNode(
        ' before uploading a CV. Select your file after signing in.',
      ),
    );

    uploadError.classList.remove('hidden');
    setContinueState(false);

    uploadStatus.textContent =
      'Sign in required before CV upload.';

    return;
  }

  const extension = file.name
    .split('.')
    .pop()
    .toLowerCase();

  if (!['pdf', 'docx'].includes(extension)) {
    fileInput.value = '';
    currentUpload = null;
    uploadedCvId = null;

    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');

    uploadedPanel.classList.add('hidden');
    setContinueState(false);

    uploadError.textContent =
      'Please choose a PDF or DOCX file.';

    uploadError.classList.remove('hidden');
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    fileInput.value = '';
    currentUpload = null;
    uploadedCvId = null;

    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');

    uploadedPanel.classList.add('hidden');
    setContinueState(false);

    uploadError.textContent =
      'This file exceeds the 10 MB upload limit. Compress it and try again.';

    uploadError.classList.remove('hidden');
    return;
  }

  fileName.textContent = file.name;
  uploadedPanel.classList.remove('hidden');

  const sizeLabel = fileName.parentElement.querySelector('span');

  if (sizeLabel) {
    sizeLabel.textContent = formatFileSize(file.size);
  }

  setAnalysisProgress(0, 'Preparing upload');

  if (currentUpload === file && uploadedCvId) {
    setContinueState(true);
    return;
  }

  currentUpload = file;
  uploadedCvId = null;
  existingSkillGap = null;

  localStorage.removeItem('skillbridgeUploadedCvId');
  localStorage.removeItem('skillbridgeUploadedCvName');
  localStorage.removeItem('skillbridgeSkillGapId');

  setContinueState(false);

  uploadStatus.textContent =
    'Uploading CV to your account…';

  setAnalysisProgress(0, 'Uploading CV');

  const formData = new FormData();

  formData.append('cv', file, file.name);

  uploadPromise = window.SkillBridgeApi.post(
    '/api/v1/cvs/upload',
    formData,
    {
      onUploadProgress: ({ percent }) => {
        setAnalysisProgress(
          percent,
          `Uploading CV • ${percent}%`,
        );
      },
    },
  )
    .then((response) => {
      const payload = window.SkillBridgeApi.unwrap(response);

      if (payload?.success === false) {
        throw new Error(
          payload.message || 'The API rejected the CV upload.',
        );
      }

      const uploadData = payload?.data ?? payload;
      const cv = uploadData?.cv || uploadData;

      if (!cv?.id) {
        throw new Error(
          'The API response did not include the uploaded CV ID.',
        );
      }

      uploadedCvId = cv.id;

      localStorage.setItem(
        'skillbridgeUploadedCvId',
        cv.id,
      );

      localStorage.setItem(
        'skillbridgeUploadedCvName',
        cv.fileName || file.name,
      );

      setAnalysisProgress(100, 'Upload complete');

      setContinueState(true);

      uploadStatus.textContent =
        'CV uploaded and ready for analysis.';
    })
    .catch((error) => {
      const guidance = {
        400: ' Check that the selected file is a valid PDF or DOCX.',
        401: ' Sign in again, then select the file to retry.',
        413: ' The file may exceed the server upload limit.',
        415: ' The server rejected this file type. Choose a PDF or DOCX.',
      }[error.status] || '';

      uploadError.textContent =
        `CV upload failed: ${error.message}${guidance}`;

      uploadError.classList.remove('hidden');

      setAnalysisProgress(0, 'Upload failed');
      setContinueState(false);

      uploadStatus.textContent =
        'CV upload failed. Try again after resolving the error.';
    })
    .finally(() => {
      uploadPromise = null;
    });
}

// =====================================================
// 7. FILE INPUT EVENTS
// =====================================================

browseButton.addEventListener('click', (event) => {
  event.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', (event) => {
  if (event.target !== browseButton) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  showFile(fileInput.files[0]);
});

uploadZone.addEventListener('dragover', (event) => {
  event.preventDefault();

  uploadZone.classList.add(
    'border-[#C550E8]',
    'bg-[#FFFDFF]',
  );
});

uploadZone.addEventListener('dragleave', (event) => {
  if (!uploadZone.contains(event.relatedTarget)) {
    uploadZone.classList.remove(
      'border-[#C550E8]',
      'bg-[#FFFDFF]',
    );
  }
});

uploadZone.addEventListener('drop', (event) => {
  event.preventDefault();

  uploadZone.classList.remove(
    'border-[#C550E8]',
    'bg-[#FFFDFF]',
  );

  const [file] = event.dataTransfer.files;

  if (!file) return;

  const transfer = new DataTransfer();

  transfer.items.add(file);
  fileInput.files = transfer.files;

  showFile(file);
});

// =====================================================
// 8. REMOVE UPLOADED CV
// =====================================================

document
  .getElementById('remove-file')
  .addEventListener('click', async () => {
    const removeButton =
      document.getElementById('remove-file');

    removeButton.disabled = true;

    try {
      if (
        uploadedCvId &&
        window.SkillBridgeApi.session()
      ) {
        await window.SkillBridgeApi.delete(
          `/api/v1/cvs/${encodeURIComponent(uploadedCvId)}`,
        );
      }
    } catch (error) {
      uploadError.textContent =
        `The uploaded CV could not be removed from your account: ${error.message}`;

      uploadError.classList.remove('hidden');
      removeButton.disabled = false;
      return;
    }

    fileInput.value = '';
    currentUpload = null;
    uploadedCvId = null;
    existingSkillGap = null;

    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');
    localStorage.removeItem('skillbridgeSkillGapId');

    uploadedPanel.classList.add('hidden');

    setContinueState(false);
    setAnalysisProgress(0, 'No file selected');

    removeButton.disabled = false;
  });

// =====================================================
// 9. RETRY UPLOAD
// =====================================================

document
  .getElementById('retry-parse')
  .addEventListener('click', () => {
    if (!fileInput.files.length) {
      uploadError.textContent =
        'Choose a PDF or DOCX file before retrying the upload.';

      uploadError.classList.remove('hidden');
      return;
    }

    currentUpload = null;
    showFile(fileInput.files[0]);
  });

// =====================================================
// 10. COMPRESSION DIALOG
// =====================================================

document
  .querySelector('a[href="#compress"]')
  ?.addEventListener('click', (event) => {
    event.preventDefault();
    compressorDialog.showModal();
  });

document
  .getElementById('close-compress-dialog')
  .addEventListener('click', () => {
    compressorDialog.close();
  });

compressorDialog.addEventListener('click', (event) => {
  if (event.target === compressorDialog) {
    compressorDialog.close();
  }
});

document
  .getElementById('choose-compressed-file')
  .addEventListener('click', () => {
    fileInput.accept =
      '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    fileInput.click();
    compressorDialog.close();
  });

// =====================================================
// 12. CONTINUE TO CV ANALYSIS
// =====================================================

continueButton.addEventListener('click', async (event) => {
  event.preventDefault();

  uploadError.textContent = '';
  uploadError.classList.add('hidden');

  if (!fileInput.files.length && !uploadedCvId) {
    uploadError.textContent =
      'Choose a CV file before continuing.';

    uploadError.classList.remove('hidden');
    setContinueState(false);
    return;
  }

  // Wait for an ongoing upload to finish.
  if (!uploadedCvId) {
    if (uploadPromise) {
      await uploadPromise;
    }

    if (!uploadedCvId) {
      uploadError.textContent =
        'Upload your CV successfully before continuing.';

      uploadError.classList.remove('hidden');
      setContinueState(false);
      return;
    }
  }

  // Read the user's answers: the account first (works on any device),
  // then this browser's survey copy.
  const stopChecking = window.SkillBridgeApi.setLoading(
    continueButton,
    'Checking your profile…',
  );

  let profile;

  try {
    profile = await window.SkillBridgeApi.getSurveyProfile();
  } finally {
    stopChecking();
  }

  // Do not generate another analysis while the saved one still matches
  // the user's current role, industry and career stage.
  if (existingSkillGap && isAnalysisCurrent(existingSkillGap, profile)) {
    window.SkillBridgeApi.setLoading(
      continueButton,
      'Opening career paths…',
    );

    window.location.href = 'career-paths.html';
    return;
  }

  const targetJobTitle = profile.targetRole;
  const industryFocus = profile.industryFocus;
  const primaryGoal = profile.primaryGoal;
  const careerStage = profile.careerStage;

  // Validate the survey information before calling
  // the backend analysis endpoint.
  if (
    !targetJobTitle ||
    !industryFocus ||
    !primaryGoal ||
    !careerStage
  ) {
    uploadError.textContent =
      'Complete your target job title, industry focus, primary goal, and career stage in the profile survey before analyzing your CV.';

    uploadError.classList.remove('hidden');
    return;
  }

  continueButton.setAttribute('aria-disabled', 'true');

  const stopLoading = window.SkillBridgeApi.setLoading(
    continueButton,
    'Analyzing your CV…',
  );

  uploadStatus.textContent = 'Analyzing your CV…';

  setAnalysisProgress(
    36,
    'Analyzing CV…',
    true,
  );

  try {
    // Send the user's actual survey choices to the backend.
    const response = await window.SkillBridgeApi.post(
      `/api/v1/cvs/${encodeURIComponent(uploadedCvId)}/analyze`,
      {
        targetJobTitle,
        industryFocus,
        careerStage,
        primaryGoal,
      },
    );

    // Unwrap the API response.
    // The backend returns the analysis information inside data.
    const responseBody = window.SkillBridgeApi.unwrap(response);

    if (responseBody?.success === false) {
      throw new Error(
        responseBody.message || 'CV analysis failed.',
      );
    }

    const analysis = responseBody?.data ?? responseBody;

    if (!analysis?.skillGapId) {
      // A CV Review has no skill gap by design: it only suggests careers.
      if (primaryGoal !== 'CV Review') {
        throw new Error(
          'The API response did not include a skill-gap analysis ID.',
        );
      }

      localStorage.setItem('skillbridgeUploadedCvId', uploadedCvId);
      localStorage.setItem('skillbridgeSelectedCareer', targetJobTitle);

      setAnalysisProgress(100, 'CV review complete');

      uploadStatus.textContent =
        'CV review completed. Choose a career path to continue.';

      window.location.href = 'career-paths.html';
      return;
    }

    // Save the successful analysis information.
    localStorage.setItem(
      'skillbridgeSkillGapId',
      analysis.skillGapId,
    );

    localStorage.setItem(
      'skillbridgeUploadedCvId',
      uploadedCvId,
    );

    localStorage.setItem(
      'skillbridgeSelectedCareer',
      targetJobTitle,
    );

    // Make the analysis available to other frontend pages.
    window.SkillBridgeApi.setAnalysisContext({
      skillGapId: analysis.skillGapId,
      careerGoal: targetJobTitle,
    });

    existingSkillGap = analysis.skillGap || {
      id: analysis.skillGapId,
      status: 'completed',
    };

    setAnalysisProgress(100, 'Analysis complete');

    uploadStatus.textContent =
      'CV analysis completed. Updating your recommendations…';

    // Refresh recommendations and roadmap separately.
    // These failures must not invalidate a successful CV analysis.
    try {
      const artifactResults =
        await window.SkillBridgeApi.refreshAnalysisArtifacts({
          skillGapId: analysis.skillGapId,
          careerGoal: targetJobTitle,
          includeRoadmap: true,
        });

      const generatedMatches =
        Array.isArray(artifactResults) &&
        artifactResults.some(
          (result) =>
            result.name === 'matches' && result.ok,
        );

      uploadStatus.textContent = generatedMatches
        ? 'CV analysis completed and your recommendations were refreshed.'
        : 'CV analysis completed. Some recommendations could not be refreshed.';
    } catch (artifactError) {
      console.error(
        'CV analysis succeeded, but refreshing recommendations failed:',
        artifactError,
      );

      uploadStatus.textContent =
        'CV analysis completed, but some recommendations could not be refreshed.';
    }

    // Continue because the CV analysis itself succeeded.
    window.location.href = 'career-paths.html';
  } catch (error) {
    uploadError.textContent = error.message;

    uploadError.classList.remove('hidden');

    setAnalysisProgress(100, 'Upload complete');

    setContinueState(true);

    uploadStatus.textContent =
      'CV analysis could not be completed. Your uploaded CV is still available.';
  } finally {
    stopLoading();
  }
});

// =====================================================
// 13. INITIALIZE SAVED CV INFORMATION
// =====================================================

loadSavedCv().catch((error) => {
  uploadError.textContent =
    `Saved CV information could not be loaded: ${error.message}`;

  uploadError.classList.remove('hidden');
});
