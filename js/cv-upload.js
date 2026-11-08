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
let uploadedCvId = localStorage.getItem('skillbridgeUploadedCvId');
let existingSkillGap = null;
let currentUpload = null;
let uploadPromise = null;

function setAnalysisProgress(percent, label, indeterminate = false) {
  parsePercent.textContent = indeterminate ? 'Analysis in progress' : `${percent}% uploaded`;
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

function listFrom(value, keys = []) {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return null;
}

function showSavedCv(cv, skillGaps) {
  uploadedCvId = cv.id;
  localStorage.setItem('skillbridgeUploadedCvId', cv.id);
  localStorage.setItem('skillbridgeUploadedCvName', cv.fileName || 'Uploaded CV');
  fileName.textContent = cv.fileName || 'Uploaded CV';
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel && Number.isFinite(cv.fileSize) && cv.fileSize > 0) {
    sizeLabel.textContent = `${(cv.fileSize / (1024 * 1024)).toFixed(1)} MB`;
  } else if (sizeLabel) {
    sizeLabel.textContent = 'Saved to your account';
  }
  uploadedPanel.classList.remove('hidden');
  existingSkillGap = skillGaps
    .filter((gap) => gap.cvId === cv.id && gap.status === 'completed')
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;
  if (existingSkillGap) {
    localStorage.setItem('skillbridgeSkillGapId', existingSkillGap.id);
    setAnalysisProgress(100, 'Analysis complete');
    uploadStatus.textContent = 'Your saved CV has an API analysis and is ready to continue.';
  } else {
    setAnalysisProgress(0, 'Ready to analyze');
  }
  setContinueState(true);
}

async function loadSavedCv() {
  if (!window.SkillBridgeApi.session()) return;
  const [cvResult, gapsResult] = await Promise.allSettled([
    window.SkillBridgeApi.get('/api/v1/cvs/my-cvs'),
    window.SkillBridgeApi.get('/api/v1/skill-gaps'),
  ]);
  if (cvResult.status === 'rejected') {
    uploadError.textContent = `Your saved CVs could not be loaded: ${cvResult.reason.message}`;
    uploadError.classList.remove('hidden');
    return;
  }
  const cvs = listFrom(window.SkillBridgeApi.unwrap(cvResult.value), ['items', 'cvs']);
  if (!cvs) throw new Error('The API returned an invalid saved CV list.');
  const skillGaps = gapsResult.status === 'fulfilled'
    ? listFrom(window.SkillBridgeApi.unwrap(gapsResult.value), ['items', 'skillGaps'])
    : [];
  if (!skillGaps) throw new Error('The API returned an invalid skill-gap list.');
  if (gapsResult.status === 'rejected') {
    uploadError.textContent = `Your saved CV is available, but its analysis status could not be checked: ${gapsResult.reason.message}`;
    uploadError.classList.remove('hidden');
  }
  const availableGaps = skillGaps;
  const preferredId = localStorage.getItem('skillbridgeUploadedCvId');
  if (!cvs.length) {
    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');
    return;
  }
  const cv = cvs.find((item) => item.id === preferredId)
    || [...cvs].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))[0];
  if (!cv || currentUpload) return;
  showSavedCv(cv, availableGaps);
}

function setContinueState(ready) {
  continueButton.setAttribute('aria-disabled', String(!ready));
  continueButton.classList.toggle('pointer-events-none', !ready);
  continueButton.classList.toggle('opacity-50', !ready);
  if (ready) {
    if (!existingSkillGap) uploadStatus.textContent = 'CV uploaded and ready for analysis';
  } else {
    uploadStatus.innerHTML = '<span class="h-3 w-3 rounded-full bg-[#81798B]"></span><span>Upload a CV or academic dossier to continue</span>';
  }
}

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
      document.createTextNode(' before uploading a CV. Select your file after signing in.'),
    );
    uploadError.classList.remove('hidden');
    setContinueState(false);
    uploadStatus.textContent = 'Sign in required before CV upload.';
    return;
  }

  const extension = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(extension)) {
    fileInput.value = '';
    currentUpload = null;
    uploadedCvId = null;
    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');
    uploadedPanel.classList.add('hidden');
    setContinueState(false);
    uploadError.textContent = 'Please choose a PDF or DOCX file.';
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
    uploadError.textContent = 'This file exceeds the 10 MB upload limit. Compress it and try again.';
    uploadError.classList.remove('hidden');
    return;
  }

  fileName.textContent = file.name;
  uploadedPanel.classList.remove('hidden');
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel) sizeLabel.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  setAnalysisProgress(0, 'Preparing upload');

  if (currentUpload === file && uploadedCvId) {
    setContinueState(true);
    return;
  }
  currentUpload = file;
  uploadedCvId = null;
  existingSkillGap = null;
  localStorage.removeItem('skillbridgeUploadedCvId');
  setContinueState(false);
  uploadStatus.textContent = 'Uploading CV to your account…';
  setAnalysisProgress(0, 'Uploading CV');
  uploadPromise = window.SkillBridgeApi.post('/api/v1/cvs/upload', (() => {
    const formData = new FormData();
    formData.append('cv', file, file.name);
    return formData;
  })(), {
    onUploadProgress: ({ percent }) => {
      setAnalysisProgress(percent, `Uploading CV • ${percent}%`);
    },
  })
    .then((response) => {
      const payload = window.SkillBridgeApi.unwrap(response);
      if (response?.success === false) {
        throw new Error(response.message || 'The API rejected the CV upload.');
      }
      const cv = payload?.cv || payload;
      if (!cv?.id) throw new Error('The API response did not include the uploaded CV ID.');
      uploadedCvId = cv.id;
      localStorage.setItem('skillbridgeUploadedCvId', cv.id);
      localStorage.setItem('skillbridgeUploadedCvName', cv.fileName || file.name);
      setAnalysisProgress(100, 'Upload complete');
      setContinueState(true);
    })
    .catch((error) => {
      const guidance = {
        400: ' Check that the selected file is a valid PDF or DOCX.',
        401: ' Sign in again, then select the file to retry.',
        413: ' The file may exceed the server upload limit.',
        415: ' The server rejected this file type. Choose a PDF or DOCX.',
      }[error.status] || '';
      uploadError.textContent = `CV upload failed: ${error.message}${guidance}`;
      uploadError.classList.remove('hidden');
      setAnalysisProgress(0, 'Upload failed');
      setContinueState(false);
      uploadStatus.textContent = 'CV upload failed. Try again after resolving the error.';
    })
    .finally(() => { uploadPromise = null; });
}

browseButton.addEventListener('click', (event) => {
  event.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', (event) => {
  if (event.target !== browseButton) fileInput.click();
});

fileInput.addEventListener('change', () => showFile(fileInput.files[0]));

uploadZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  uploadZone.classList.add('border-[#C550E8]', 'bg-[#FFFDFF]');
});

uploadZone.addEventListener('dragleave', (event) => {
  if (!uploadZone.contains(event.relatedTarget)) {
    uploadZone.classList.remove('border-[#C550E8]', 'bg-[#FFFDFF]');
  }
});

uploadZone.addEventListener('drop', (event) => {
  event.preventDefault();
  uploadZone.classList.remove('border-[#C550E8]', 'bg-[#FFFDFF]');
  const [file] = event.dataTransfer.files;
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  showFile(file);
});

document.getElementById('remove-file').addEventListener('click', async () => {
  const removeButton = document.getElementById('remove-file');
  removeButton.disabled = true;
  try {
    if (uploadedCvId && window.SkillBridgeApi.session()) {
      await window.SkillBridgeApi.delete(`/api/v1/cvs/${encodeURIComponent(uploadedCvId)}`);
    }
  } catch (error) {
    uploadError.textContent = `The uploaded CV could not be removed from your account: ${error.message}`;
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
  uploadedPanel.classList.add('hidden');
  setContinueState(false);
  setAnalysisProgress(0, 'No file selected');
  removeButton.disabled = false;
});

document.getElementById('retry-parse').addEventListener('click', () => {
  if (!fileInput.files.length) {
    uploadError.textContent = 'Choose a PDF or DOCX file before retrying the upload.';
    uploadError.classList.remove('hidden');
    return;
  }
  currentUpload = null;
  showFile(fileInput.files[0]);
});

document.querySelector('a[href="#compress"]')?.addEventListener('click', (event) => {
  event.preventDefault();
  compressorDialog.showModal();
});

document.getElementById('close-compress-dialog').addEventListener('click', () => compressorDialog.close());
compressorDialog.addEventListener('click', (event) => {
  if (event.target === compressorDialog) compressorDialog.close();
});
document.getElementById('choose-compressed-file').addEventListener('click', () => {
  fileInput.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileInput.click();
  compressorDialog.close();
});

continueButton.addEventListener('click', async (event) => {
  event.preventDefault();
  if (!fileInput.files.length && !uploadedCvId) {
    uploadError.textContent = 'Choose a CV file before continuing.';
    uploadError.classList.remove('hidden');
    setContinueState(false);
    return;
  }
  if (!uploadedCvId) {
    if (uploadPromise) await uploadPromise;
    if (!uploadedCvId) {
      uploadError.textContent = 'Upload your CV successfully before continuing.';
      uploadError.classList.remove('hidden');
      setContinueState(false);
      return;
    }
  }
  if (existingSkillGap) {
    window.SkillBridgeApi.setLoading(continueButton, 'Opening career paths…');
    window.location.href = 'career-paths.html';
    return;
  }

  const survey = (() => {
    try { return JSON.parse(localStorage.getItem('skillbridge_survey') || '{}').data || {}; }
    catch { return {}; }
  })();
  const targetJobTitle = {
    'fintech-data': 'Junior Fintech Data Analyst',
    backend: 'Associate Backend Engineer',
    'growth-product': 'Growth Product Associate',
  }[survey.track];
  if (!targetJobTitle) {
    uploadError.textContent = 'Complete the profile survey and select a career focus before analyzing your CV.';
    uploadError.classList.remove('hidden');
    return;
  }
  const careerStage = survey.availability === 'final-year' ? 'Student' : 'Entry';
  continueButton.setAttribute('aria-disabled', 'true');
  const stopLoading = window.SkillBridgeApi.setLoading(continueButton, 'Analyzing your CV…');
  uploadStatus.textContent = 'Analyzing your CV…';
  setAnalysisProgress(36, 'Analyzing CV…', true);
  try {
    const response = await window.SkillBridgeApi.post(`/api/v1/cvs/${encodeURIComponent(uploadedCvId)}/analyze`, {
      targetJobTitle,
      industryFocus: survey.track === 'fintech-data' ? 'Financial Technology' : 'Technology',
      careerStage,
      primaryGoal: 'Gap Analysis',
    });
    const analysis = window.SkillBridgeApi.unwrap(response);
    if (!analysis?.skillGapId) throw new Error('The API response did not include a skill-gap analysis ID.');
    localStorage.setItem('skillbridgeSkillGapId', analysis.skillGapId);
    localStorage.setItem('skillbridgeUploadedCvId', uploadedCvId);
    existingSkillGap = analysis.skillGap || { id: analysis.skillGapId, status: 'completed' };
    setAnalysisProgress(100, 'Analysis complete');
    uploadStatus.textContent = 'CV analysis completed by the SkillBridge API.';
    window.location.href = 'career-paths.html';
  } catch (error) {
    uploadError.textContent = error.message;
    uploadError.classList.remove('hidden');
    uploadStatus.textContent = 'CV analysis could not be completed.';
    setAnalysisProgress(100, 'Upload complete');
    setContinueState(true);
  } finally {
    stopLoading();
  }
});

loadSavedCv().catch((error) => {
  uploadError.textContent = `Saved CV information could not be loaded: ${error.message}`;
  uploadError.classList.remove('hidden');
});
