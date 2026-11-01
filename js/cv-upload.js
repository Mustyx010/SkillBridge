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
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const compressorDialog = document.getElementById('compress-dialog');
const diagnosticStatus = document.getElementById('diagnostic-action-status');
let uploadedCvId = localStorage.getItem('skillbridgeUploadedCvId');
let currentUpload = null;
let uploadPromise = null;

function announceDiagnostic(message) {
  diagnosticStatus.textContent = message;
  diagnosticStatus.classList.remove('hidden');
}

function setContinueState(ready) {
  continueButton.setAttribute('aria-disabled', String(!ready));
  continueButton.classList.toggle('pointer-events-none', !ready);
  continueButton.classList.toggle('opacity-50', !ready);
  if (ready) {
    uploadStatus.innerHTML = '<span class="h-3 w-3 rounded-full bg-[#731F94]"></span><span class="font-semibold text-[#181445]">CV uploaded and ready for analysis</span>';
  } else {
    uploadStatus.innerHTML = '<span class="h-3 w-3 rounded-full bg-[#81798B]"></span><span>Upload a CV or academic dossier to continue</span>';
  }
}

function showFile(file) {
  uploadError.textContent = '';
  uploadError.classList.add('hidden');
  if (!file) return;

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
    uploadError.textContent = 'This file exceeds the 4 MB upload limit. Compress it and try again.';
    uploadError.classList.remove('hidden');
    return;
  }

  fileName.textContent = file.name;
  uploadedPanel.classList.remove('hidden');
  localStorage.setItem('skillbridgeUploadedCvName', file.name);
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel) sizeLabel.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  parsePercent.textContent = '78%';
  parseProgressLabel.textContent = '78% Complete';
  parseProgress.style.width = '78%';

  if (currentUpload === file && uploadedCvId) {
    setContinueState(true);
    return;
  }
  currentUpload = file;
  uploadedCvId = null;
  localStorage.removeItem('skillbridgeUploadedCvId');
  if (window.SkillBridgeApi.session()?.offline) {
    setContinueState(true);
    uploadStatus.textContent = 'Local preview mode. Your CV was not uploaded to the backend.';
    return;
  }
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
      const session = window.SkillBridgeApi.session();
      let storedUser = {};
      try {
        storedUser = JSON.parse(localStorage.getItem('skillbridge_user') || '{}');
      } catch {
        storedUser = {};
      }
      const user = session?.user || storedUser;
      window.SkillBridgeApi.setOfflineSession({
        fullName: user.fullName || user.name || 'Candidate',
        email: user.email || '',
        id: user.id,
      });
      uploadError.textContent = `${error.message} Continuing with a local preview; the CV was not uploaded.`;
      uploadError.classList.remove('hidden');
      setContinueState(true);
      uploadStatus.textContent = 'Local preview mode. Your CV was not uploaded to the backend.';
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
  localStorage.removeItem('skillbridgeUploadedCvId');
  localStorage.removeItem('skillbridgeUploadedCvName');
  uploadedPanel.classList.add('hidden');
  setContinueState(false);
  parsePercent.textContent = '0%';
  parseProgressLabel.textContent = '0% Complete';
  parseProgress.style.width = '0%';
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
  announceDiagnostic('Choose a text-native PDF (maximum 4 MB).');
});

continueButton.addEventListener('click', async (event) => {
  event.preventDefault();
  if (!fileInput.files.length) {
    uploadError.textContent = 'Choose a CV file before continuing.';
    uploadError.classList.remove('hidden');
    setContinueState(false);
    return;
  }
  if (!uploadedCvId && !window.SkillBridgeApi.session()?.offline) {
    if (uploadPromise) await uploadPromise;
    if (!uploadedCvId) {
      uploadError.textContent = 'Upload your CV successfully before continuing.';
      uploadError.classList.remove('hidden');
      setContinueState(false);
      return;
    }
  }
  if (window.SkillBridgeApi.session()?.offline) {
    uploadStatus.textContent = 'Continuing in local preview. CV analysis was not sent to the backend.';
    window.location.href = 'career-paths.html';
    return;
  }
  const survey = (() => {
    try { return JSON.parse(localStorage.getItem('skillbridge_survey') || '{}').data || {}; }
    catch { return {}; }
  })();
  const careers = {
    'fintech-data': 'Junior Fintech Data Analyst',
    backend: 'Associate Backend Engineer',
    'growth-product': 'Growth Product Associate',
  };
  const role = localStorage.getItem('skillbridgeSelectedCareer') || careers[survey.track] || 'Junior Fintech Data Analyst';
  const careerStage = survey.availability === 'final-year' ? 'Student' : 'Entry';
  continueButton.setAttribute('aria-disabled', 'true');
  continueButton.classList.add('pointer-events-none', 'opacity-50');
  uploadStatus.textContent = 'Analyzing your CV…';
  try {
    const response = await window.SkillBridgeApi.post(`/api/v1/cvs/${encodeURIComponent(uploadedCvId)}/analyze`, {
      targetJobTitle: role,
      industryFocus: survey.track === 'fintech-data' ? 'Financial Technology' : 'Technology',
      careerStage,
      primaryGoal: 'Gap Analysis',
    });
    const analysis = window.SkillBridgeApi.unwrap(response);
    if (!analysis?.skillGapId) throw new Error('The API response did not include a skill-gap analysis ID.');
    localStorage.setItem('skillbridgeSkillGapId', analysis.skillGapId);
    window.location.href = 'career-paths.html';
  } catch (error) {
    uploadError.textContent = error.message;
    uploadError.classList.remove('hidden');
    uploadStatus.textContent = 'CV analysis could not be completed.';
    setContinueState(true);
  }
});
