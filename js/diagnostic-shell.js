const readProfile = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
};
const user = readProfile('skillbridge_user');
const survey = readProfile('skillbridge_survey');
const fullName = survey.data?.fullName || user.name || 'Amaka Okafor';
const givenName = fullName.trim().split(/\s+/)[0] || 'Candidate';
const familyName = fullName.trim().split(/\s+/).at(-1) || '';
document.getElementById('diagnostic-user-name').textContent = `${givenName} ${familyName ? `${familyName[0]}.` : ''}`;

const sidebar = document.getElementById('diagnostic-sidebar');
const backdrop = document.getElementById('diagnostic-backdrop');
const menuButton = document.getElementById('diagnostic-menu-button');
const setSidebarOpen = (open) => {
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
};
menuButton.addEventListener('click', () => setSidebarOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => setSidebarOpen(false));
sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) setSidebarOpen(false); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setSidebarOpen(false); });

const searchForm = document.getElementById('diagnostic-search-form');
const searchInput = document.getElementById('diagnostic-search');
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (query) window.location.href = `opportunities.html?q=${encodeURIComponent(query)}`;
});

document.getElementById('diagnostic-notifications').addEventListener('click', () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'w-[min(92vw,420px)] rounded-2xl border-0 p-6 text-[#181445] shadow-2xl backdrop:bg-[#181445]/40';
  dialog.innerHTML = '<div class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-bold">Notifications</h2><p class="mt-2 text-sm leading-6 text-[#625B6D]">Youâ€™re all caught up. Sprint and mentor updates will appear here.</p></div><button type="button" class="text-xl" aria-label="Close">Ã—</button></div>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => { dialog.close(); dialog.remove(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { dialog.close(); dialog.remove(); } });
  dialog.showModal();
});
