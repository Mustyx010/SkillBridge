const skillCount = document.getElementById('skill-count');
const technicalSkills = document.getElementById('technical-skills');
const editorSkillName = document.getElementById('editor-skill-name');
const editorEvidence = document.getElementById('skill-evidence');
const radios = [...document.querySelectorAll('input[name="skill-level"]')];
let selectedCard = document.querySelector('.skill-card');
let savedLevel = Number(selectedCard?.dataset.level || 4);

const levelNames = {
  1: 'Beginner',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

function drawDots(card) {
  const dots = card.querySelector('.skill-dots');
  const level = Number(card.dataset.level || 1);
  dots.replaceChildren();
  for (let index = 1; index <= 5; index += 1) {
    const dot = document.createElement('span');
    dot.className = `h-2.5 w-2.5 rounded-full ${index <= level ? 'bg-[#630ED4]' : 'bg-[#E3DDF1]'}`;
    dots.append(dot);
  }
  card.querySelector('.level-chip').textContent = `Level ${level}`;
  card.querySelector('.level-name').textContent = levelNames[level];
  dots.setAttribute('aria-label', `${level} out of 5 proficiency`);
}

document.querySelectorAll('.skill-card').forEach(drawDots);

const uploadedCv = localStorage.getItem('skillbridgeUploadedCvName');
if (uploadedCv) document.getElementById('source-file-name').textContent = uploadedCv;

function chooseCard(card) {
  if (!card) return;
  selectedCard = card;
  savedLevel = Number(card.dataset.level || 1);
  editorSkillName.textContent = card.dataset.skill === 'SQL' ? 'SQL (PostgreSQL)' : card.dataset.skill;
  editorEvidence.textContent = card.dataset.skill === 'SQL'
    ? '“Designed relational PostgreSQL schemas tracking 40,000+ daily transaction records at UNILAG Fintech Lab.”'
    : 'Evidence identified in the uploaded CV, academic records, and project history.';
  radios.forEach((radio) => { radio.checked = Number(radio.value) === savedLevel; });
}

document.addEventListener('click', (event) => {
  const editButton = event.target.closest('.edit-skill');
  if (editButton) chooseCard(editButton.closest('.skill-card'));

  const removeButton = event.target.closest('.remove-skill');
  if (removeButton) {
    const card = removeButton.closest('.skill-card');
    const removedSelected = card === selectedCard;
    card.remove();
    skillCount.textContent = Math.max(0, Number(skillCount.textContent) - 1);
    document.getElementById('technical-count').textContent = `${technicalSkills.querySelectorAll('.skill-card').length} items`;
    if (removedSelected) {
      selectedCard = null;
      chooseCard(technicalSkills.querySelector('.skill-card'));
    }
  }
});

document.getElementById('save-level').addEventListener('click', () => {
  if (!selectedCard) return;
  const chosen = radios.find((radio) => radio.checked);
  if (!chosen) return;
  selectedCard.dataset.level = chosen.value;
  savedLevel = Number(chosen.value);
  drawDots(selectedCard);
});

document.getElementById('cancel-level').addEventListener('click', () => {
  radios.forEach((radio) => { radio.checked = Number(radio.value) === savedLevel; });
});

const addSkillDialog = document.getElementById('custom-skill-dialog');
const customSkillName = document.getElementById('custom-skill-name');
document.getElementById('add-skill').addEventListener('click', () => {
  customSkillName.value = '';
  addSkillDialog.showModal();
  customSkillName.focus();
});

document.getElementById('save-custom-skill').addEventListener('click', (event) => {
  event.preventDefault();
  const name = customSkillName.value.trim();
  if (!name) {
    customSkillName.focus();
    return;
  }
  const card = document.createElement('article');
  card.className = 'skill-card rounded-xl bg-[#F5F0FD] p-4';
  card.dataset.skill = name;
  card.dataset.level = '1';

  const header = document.createElement('div');
  header.className = 'flex items-start justify-between gap-2';
  const title = document.createElement('h3');
  title.className = 'text-sm font-bold';
  title.textContent = name;
  const chip = document.createElement('span');
  chip.className = 'level-chip rounded-full bg-[#E9D8FF] px-2.5 py-1 text-[10px] font-semibold text-[#630ED4]';
  header.append(title, chip);

  const description = document.createElement('p');
  description.className = 'mt-1 text-xs text-[#625B6D]';
  description.textContent = 'Candidate added skill';

  const controls = document.createElement('div');
  controls.className = 'mt-3 flex items-center justify-between gap-2';
  const levelGroup = document.createElement('div');
  levelGroup.className = 'flex items-center gap-1';
  const dots = document.createElement('span');
  dots.className = 'skill-dots flex gap-1';
  const levelLabel = document.createElement('span');
  levelLabel.className = 'level-name ml-1 text-[10px] font-semibold text-[#4A4455]';
  levelGroup.append(dots, levelLabel);
  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-2 text-[10px]';
  const edit = document.createElement('button');
  edit.className = 'edit-skill font-semibold text-[#630ED4] underline';
  edit.type = 'button';
  edit.textContent = 'Edit';
  const separator = document.createElement('span');
  separator.className = 'text-[#C8BED5]';
  separator.textContent = '•';
  const remove = document.createElement('button');
  remove.className = 'remove-skill font-semibold text-[#625B6D]';
  remove.type = 'button';
  remove.textContent = 'Remove';
  actions.append(edit, separator, remove);
  controls.append(levelGroup, actions);
  card.append(header, description, controls);
  technicalSkills.append(card);
  drawDots(card);
  skillCount.textContent = String(Number(skillCount.textContent) + 1);
  document.getElementById('technical-count').textContent = `${technicalSkills.querySelectorAll('.skill-card').length} items`;
  addSkillDialog.close();
});
