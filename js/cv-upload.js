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
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const compressorDialog = document.getElementById('compress-dialog');
const diagnosticStatus = document.getElementById('diagnostic-action-status');

function announceDiagnostic(message) {
  diagnosticStatus.textContent = message;
  diagnosticStatus.classList.remove('hidden');
}

function setContinueState(ready) {
  continueButton.setAttribute('aria-disabled', String(!ready));
  continueButton.classList.toggle('pointer-events-none', !ready);
  continueButton.classList.toggle('opacity-50', !ready);
  if (ready) {
    uploadStatus.innerHTML = '<span class="h-3 w-3 rounded-full bg-[#731F94]"></span><span class="font-semibold text-[#181445]">File parsed &amp; verified</span><span class="h-2 w-2 rounded-full bg-[#C8BED5]" aria-hidden="true"></span><span>Estimated extraction time: 4 seconds</span>';
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
    uploadError.textContent = 'Choose a PDF file for the text-native document check.';
    uploadError.classList.remove('hidden');
    announceDiagnostic('That file is not a PDF. Choose a text-native PDF to continue.');
    return;
  }
  if (!['pdf', 'docx'].includes(extension)) {
    fileInput.value = '';
    localStorage.removeItem('skillbridgeUploadedCvName');
    uploadedPanel.classList.add('hidden');
    setContinueState(false);
    uploadError.textContent = 'Please choose a PDF or DOCX file.';
    uploadError.classList.remove('hidden');
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    fileInput.value = '';
    localStorage.removeItem('skillbridgeUploadedCvName');
    uploadedPanel.classList.add('hidden');
    setContinueState(false);
    uploadError.textContent = 'This file exceeds the 5 MB upload limit. Compress it and try again.';
    uploadError.classList.remove('hidden');
    return;
  }

  fileName.textContent = file.name;
  uploadedPanel.classList.remove('hidden');
  setContinueState(true);
  localStorage.setItem('skillbridgeUploadedCvName', file.name);
  const sizeLabel = fileName.parentElement.querySelector('span');
  if (sizeLabel) sizeLabel.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  parsePercent.textContent = '78%';
  parseProgressLabel.textContent = '78% Complete';
  parseProgress.style.width = '78%';
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

document.getElementById('remove-file').addEventListener('click', () => {
  fileInput.value = '';
  localStorage.removeItem('skillbridgeUploadedCvName');
  uploadedPanel.classList.add('hidden');
  setContinueState(false);
  parsePercent.textContent = '0%';
  parseProgressLabel.textContent = '0% Complete';
  parseProgress.style.width = '0%';
});

document.getElementById('retry-parse').addEventListener('click', () => {
  if (!fileInput.files.length) {
    uploadError.textContent = 'Choose a PDF or DOCX file before retrying extraction.';
    uploadError.classList.remove('hidden');
    return;
  }
  showFile(fileInput.files[0]);
  announceDiagnostic('File checks passed. Parsing preview refreshed.');
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
  announceDiagnostic('Choose a text-native PDF (maximum 5 MB).');
});

continueButton.addEventListener('click', (event) => {
  if (!fileInput.files.length) {
    event.preventDefault();
    setContinueState(false);
  }
});
