// Make placeholder policy/help links explain their current prototype status.
const infoDialog = document.createElement('dialog');
infoDialog.id = 'site-info-dialog';
infoDialog.className = 'w-[min(92vw,440px)] rounded-2xl p-0 text-[#181445] shadow-2xl backdrop:bg-[#181445]/30';
infoDialog.innerHTML = '<div class="p-6"><div class="flex items-start justify-between gap-4"><div><h2 id="site-info-title" class="text-lg font-bold"></h2><p id="site-info-message" class="mt-2 text-sm leading-6 text-[#625B6D]"></p></div><button type="button" aria-label="Close" class="site-info-close rounded-lg px-2 py-1 text-xl text-[#625B6D] hover:bg-[#F0E9FF]">×</button></div><button type="button" class="site-info-close mt-5 w-full rounded-lg bg-[#630ED4] px-4 py-2.5 text-sm font-semibold text-white">Close</button></div>';
document.body.append(infoDialog);

const infoCopy = (label) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('privacy')) return ['Privacy information', 'This prototype saves onboarding answers, uploaded file names, and progress in this browser. It does not send uploaded documents to a parsing server. Clear this site’s browser storage to remove saved prototype data.'];
  if (normalized.includes('terms') || normalized.includes('standard')) return ['Service information', 'The production terms and security documentation are not connected in this prototype.'];
  return ['Help & assistance', 'Support services are not connected in this prototype. Use the page controls to continue through the local onboarding flow.'];
};

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href="#"], a[href^="#"]');
  if (!link || link.getAttribute('href') === '#compress') return;
  const targetId = link.getAttribute('href').slice(1);
  if (targetId && document.getElementById(targetId)) return;
  event.preventDefault();
  const [title, message] = infoCopy(link.textContent.trim());
  document.getElementById('site-info-title').textContent = title;
  document.getElementById('site-info-message').textContent = message;
  infoDialog.showModal();
});

infoDialog.addEventListener('click', (event) => {
  if (event.target === infoDialog || event.target.closest('.site-info-close')) infoDialog.close();
});
