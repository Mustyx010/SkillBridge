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
const diagnosticStatus = document.getElementById('diagnostic-action-status');
const diagnosticCards = document.querySelector('[aria-labelledby="diagnostics-title"] .mt-4.space-y-2');
if (diagnosticCards) {
  diagnosticCards.replaceChildren();
  const guidance = document.createElement('p');
  guidance.className = 'rounded-xl bg-[#F6F1FD] p-4 text-xs leading-5 text-[#625B6D]';
  guidance.textContent = 'Choose a PDF or DOCX file up to 10 MB. The SkillBridge API analyzes your CV after upload when you continue.';
  diagnosticCards.append(guidance);
}
let uploadedCvId = localStorage.getItem('skillbridgeUploadedCvId');
let existingSkillGap = null;
let currentUpload = null;
let uploadPromise = null;

function announceDiagnostic(message) {
  diagnosticStatus.textContent = message;
  diagnosticStatus.classList.remove('hidden');
}

function setAnalysisProgress(percent, label) {
  parsePercent.textContent = `${percent}%`;
  parseProgressLabel.textContent = label;
  parseProgress.style.width = `${percent}%`;
}

function hideSampleAnalysis() {
  uploadedPanel.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.textContent.includes('Processing with Nigerian Academic Entity Classifier')) {
      paragraph.textContent = 'Analysis is performed by the SkillBridge API when you continue.';
    }
    if (paragraph.textContent.includes('Live Parsing Pipeline') || paragraph.textContent.includes('Identified Metadata Tokens')) {
      paragraph.parentElement.remove();
    }
  });
}

function showSavedCv(cv, skillGaps) {
  uploadedCvId = cv.id;
  localStorage.setItem('skillbridgeUploadedCvId', cv.id);
  localStorage.setItem('skillbridgeUploadedCvName', cv.fileName || 'Uploaded CV');
  fileName.textContent = cv.fileName || 'Uploaded CV';
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel && Number.isFinite(cv.fileSize)) {
    sizeLabel.textContent = `${(cv.fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  uploadedPanel.classList.remove('hidden');
  hideSampleAnalysis();
  existingSkillGap = skillGaps
    .filter((gap) => gap.cvId === cv.id && gap.status === 'completed')
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;
  if (existingSkillGap) {
    localStorage.setItem('skillbridgeSkillGapId', existingSkillGap.id);
    setAnalysisProgress(100, 'Analysis complete');
    uploadStatus.textContent = 'Your saved CV has an API analysis and is ready to continue.';
  } else {
    setAnalysisProgress(0, 'Analysis not run');
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
  const cvs = window.SkillBridgeApi.unwrap(cvResult.value);
  if (!Array.isArray(cvs)) throw new Error('The API returned an invalid saved CV list.');
  const skillGaps = gapsResult.status === 'fulfilled'
    ? window.SkillBridgeApi.unwrap(gapsResult.value)
    : [];
  if (gapsResult.status === 'rejected') {
    uploadError.textContent = `Your saved CV is available, but its analysis status could not be checked: ${gapsResult.reason.message}`;
    uploadError.classList.remove('hidden');
  }
  const availableGaps = Array.isArray(skillGaps) ? skillGaps : [];
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
  if (fileInput.dataset.pdfOnly === 'true' && extension !== 'pdf') {
    fileInput.value = '';
    currentUpload = null;
    uploadedCvId = null;
    localStorage.removeItem('skillbridgeUploadedCvId');
    localStorage.removeItem('skillbridgeUploadedCvName');
    uploadedPanel.classList.add('hidden');
    setContinueState(false);
    uploadError.textContent = 'Choose a PDF file for the text-native document check.';
    uploadError.classList.remove('hidden');
    announceDiagnostic('That file is not a PDF. Choose a text-native PDF to continue.');
    return;
  }
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
  hideSampleAnalysis();
  localStorage.setItem('skillbridgeUploadedCvName', file.name);
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel) sizeLabel.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  setAnalysisProgress(0, 'Waiting for analysis');

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
  uploadPromise = window.SkillBridgeApi.post('/api/v1/cvs/upload', (() => {
    const formData = new FormData();
    formData.append('cv', file);
    return formData;
  })())
    .then((response) => {
      const cv = window.SkillBridgeApi.unwrap(response);
      if (!cv?.id) throw new Error('The API response did not include the uploaded CV ID.');
      uploadedCvId = cv.id;
      localStorage.setItem('skillbridgeUploadedCvId', cv.id);
      setContinueState(true);
    })
    .catch((error) => {
      const status = error.status ? ` (HTTP ${error.status})` : '';
      const guidance = error.status === 401
        ? ' Your session may have expired; sign in again and retry.'
        : '';
      uploadError.textContent = `CV upload failed${status}: ${error.message}${guidance}`;
      uploadError.classList.remove('hidden');
      setContinueState(false);
      uploadStatus.textContent = 'CV upload failed. Try again after resolving the error.';
    });
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
  setAnalysisProgress(0, '0% Complete');
  removeButton.disabled = false;
});

document.getElementById('retry-parse').addEventListener('click', () => {
  if (!fileInput.files.length) {
    uploadError.textContent = 'Choose a PDF or DOCX file before retrying extraction.';
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
  delete fileInput.dataset.pdfOnly;
  fileInput.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileInput.click();
  compressorDialog.close();
});

document.getElementById('deep-ocr-button').addEventListener('click', () => {
  if (!fileInput.files.length) {
    announceDiagnostic('Upload a scanned PDF first, then run deep OCR on that file.');
    uploadZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!fileInput.files[0].name.toLowerCase().endsWith('.pdf')) {
    announceDiagnostic('Deep OCR is available for PDF uploads. Choose a PDF to continue.');
    return;
  }
  announceDiagnostic('Deep OCR requested. This preview has no OCR service connected yet.');
});

document.getElementById('text-native-pdf-button').addEventListener('click', () => {
  fileInput.dataset.pdfOnly = 'true';
  fileInput.accept = '.pdf,application/pdf';
  fileInput.click();
  announceDiagnostic('Choose a text-native PDF (maximum 10 MB).');
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
  const survey = (() => {
    try { return JSON.parse(localStorage.getItem('skillbridge_survey') || '{}').data || {}; }
    catch { return {}; }
  })();
  const careerStage = survey.availability === 'final-year' ? 'Student' : 'Entry';
  continueButton.setAttribute('aria-disabled', 'true');
  continueButton.classList.add('pointer-events-none', 'opacity-50');
  uploadStatus.textContent = 'Analyzing your CV…';
  try {
    const response = await window.SkillBridgeApi.post(`/api/v1/cvs/${encodeURIComponent(uploadedCvId)}/analyze`, {
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
    setContinueState(true);
  }
});

loadSavedCv().catch((error) => {
  uploadError.textContent = `Saved CV information could not be loaded: ${error.message}`;
  uploadError.classList.remove('hidden');
});
