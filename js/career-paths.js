const pathCards = [...document.querySelectorAll('.career-card')];
const pathForm = document.getElementById('path-search-form');
const pathSearch = document.getElementById('path-search');
const dashboardCta = document.getElementById('dashboard-cta');

pathForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = pathSearch.value.trim().toLowerCase();
  pathCards.forEach((card) => {
    card.hidden = query.length > 0 && !card.dataset.role.toLowerCase().includes(query);
  });
});

pathSearch.addEventListener('input', () => {
  if (!pathSearch.value.trim()) pathCards.forEach((card) => { card.hidden = false; });
});

const pathStatus = document.createElement('p');
pathStatus.className = 'mt-3 text-xs text-[#625B6D]';
pathStatus.setAttribute('role', 'status');
document.getElementById('career-path-list')?.before(pathStatus);

document.querySelectorAll('.select-path').forEach((button) => {
  button.addEventListener('click', async () => {
    const card = button.closest('.career-card');
    pathCards.forEach((item) => item.classList.remove('ring-2', 'ring-[#8527A1]'));
    card.classList.add('ring-2', 'ring-[#8527A1]');
    localStorage.setItem('skillbridgeSelectedCareer', card.dataset.role);
    dashboardCta.setAttribute('aria-disabled', 'false');
    dashboardCta.classList.remove('pointer-events-none', 'opacity-50');
    document.querySelectorAll('.select-path').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    button.disabled = true;
    try {
      await window.SkillBridgeApi.put('/api/v1/profiles/me', { careerGoal: card.dataset.role });
      pathStatus.textContent = `${card.dataset.role} saved as your profile career goal.`;
    } catch (error) {
      pathStatus.classList.add('text-red-700');
      pathStatus.textContent = `The career path was selected locally, but could not be saved to your profile: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll('.compare-path').forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const active = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('ring-2', active);
    button.classList.toggle('ring-[#8527A1]', active);
  });
});

const selectedCareer = localStorage.getItem('skillbridgeSelectedCareer');
if (selectedCareer) {
  const selectedCard = pathCards.find((card) => card.dataset.role === selectedCareer);
  if (selectedCard) {
    selectedCard.classList.add('ring-2', 'ring-[#8527A1]');
    dashboardCta.setAttribute('aria-disabled', 'false');
    dashboardCta.classList.remove('pointer-events-none', 'opacity-50');
  }
}
