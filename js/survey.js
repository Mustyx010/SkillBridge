
const form = document.getElementById("survey-form");
const STORAGE_KEY = "skillbridge_survey";

// =====================================================
// 1. SALARY RANGE SLIDER
// =====================================================

const payMin = document.getElementById("pay-min");
const payMax = document.getElementById("pay-max");
const payFill = document.getElementById("pay-fill");
const payRange = document.getElementById("pay-range");

const GAP = 10000;

const naira = (n) =>
  "₦" + Number(n).toLocaleString("en-US");

function updateRange(changed) {
  if (!payMin || !payMax || !payFill || !payRange) return;

  let low = Number(payMin.value);
  let high = Number(payMax.value);

  if (high - low < GAP) {
    if (changed === payMin) {
      low = high - GAP;
    } else {
      high = low + GAP;
    }

    payMin.value = low;
    payMax.value = high;
  }

  const min = Number(payMin.min);
  const span = Number(payMin.max) - min;

  if (span <= 0) return;

  payFill.style.left =
    `calc(9px + (100% - 18px) * ${(low - min) / span})`;

  payFill.style.width =
    `calc((100% - 18px) * ${(high - low) / span})`;

  payRange.textContent =
    `${naira(low)} – ${naira(high)}`;
}

[payMin, payMax].forEach((input) => {
  input?.addEventListener("input", () => updateRange(input));
});

// =====================================================
// 2. INSTITUTION SUGGESTIONS
// =====================================================

const institution = document.getElementById("institution");

document.querySelectorAll("[data-institution]").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!institution) return;

    institution.value = chip.dataset.institution;

    institution.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    institution.focus();
  });
});

// =====================================================
// 3. AUTO-SAVE
// =====================================================

const saveStatus = document.getElementById("save-status");

let savedAt = null;
let timer;

function readForm() {
  return Object.fromEntries(new FormData(form));
}

function timeAgo() {
  if (!savedAt) return "";

  const minutes = Math.floor(
    (Date.now() - savedAt) / 60000
  );

  if (minutes < 1) return "just now";

  return minutes === 1
    ? "1 min ago"
    : `${minutes} min ago`;
}

function showStatus() {
  if (!savedAt || !saveStatus) return;

  saveStatus.textContent =
    `Step 1 of 4 • Auto-saved ${timeAgo()}`;
}

function save(completed = false) {
  savedAt = Date.now();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      data: readForm(),
      savedAt,
      completed,
    })
  );

  showStatus();
}

function restore() {
  let saved;

  try {
    saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return;
  }

  if (!saved || !saved.data) return;

  Object.entries(saved.data).forEach(([name, value]) => {
    const fields = form.querySelectorAll(
      `[name="${name}"]`
    );

    fields.forEach((field) => {
      if (field.type === "radio") {
        field.checked = field.value === value;
      } else if (field.type === "checkbox") {
        field.checked = Array.isArray(value)
          ? value.includes(field.value)
          : field.value === value;
      } else {
        field.value = value;
      }
    });
  });

  updateRange();

  savedAt = saved.savedAt || Date.now();

  showStatus();
}

form.addEventListener("input", () => {
  clearTimeout(timer);

  timer = setTimeout(() => save(), 600);
});

form.addEventListener("change", () => save());

setInterval(showStatus, 30000);

// =====================================================
// 4. CAREER STAGE MAPPING
// =====================================================

// The survey uses different values from the backend.
// Convert them before sending the profile data.

const careerStageMap = {
  "final-year": "Student",
  graduate: "Entry",
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  "career-pivot": "Pivot",
};

// =====================================================
// 5. HELPER FUNCTIONS
// =====================================================

// Convert salary values into integers.
// Empty values are saved as null.

function toNullableInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 0) {
    return null;
  }

  return number;
}

// Display form errors.

function showError(message) {
  window.SkillBridgeApi.showStatus(
    form,
    message,
    true
  );
}

// =====================================================
// 6. CONTINUE TO CV UPLOAD
// =====================================================

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = readForm();

  // -----------------------------------------------
  // Validate required career information
  // -----------------------------------------------

  if (!data.targetJobTitle?.trim()) {
    showError(
      "Enter your target job role before continuing."
    );

    document.getElementById("targetJobTitle")?.focus();

    return;
  }

  if (!data.industryFocus?.trim()) {
    showError(
      "Enter your preferred industry before continuing."
    );

    document.getElementById("industryFocus")?.focus();

    return;
  }

  if (!data.primaryGoal) {
    showError(
      "Select your primary career goal before continuing."
    );

    document.getElementById("primaryGoal")?.focus();

    return;
  }

  // -----------------------------------------------
  // Map the survey career stage to backend values
  // -----------------------------------------------

  const careerStage = data.availability
    ? careerStageMap[data.availability]
    : null;

  if (data.availability && !careerStage) {
    showError(
      "Your selected career stage is not supported. Please select it again."
    );

    return;
  }

  // -----------------------------------------------
  // Convert salary values into numbers
  // -----------------------------------------------

  const minimumSalary = toNullableInteger(data.payMin);
  const maximumSalary = toNullableInteger(data.payMax);

  if (
    minimumSalary !== null &&
    maximumSalary !== null &&
    minimumSalary > maximumSalary
  ) {
    showError(
      "Your minimum salary cannot be greater than your maximum salary."
    );

    return;
  }

  // -----------------------------------------------
  // Prepare education information
  // -----------------------------------------------

  const education = [
    data.degree,
    data.field,
    data.institution,
  ]
    .filter((value) => value?.trim())
    .join(" - ");

  // -----------------------------------------------
  // Prepare the profile data for the backend
  // -----------------------------------------------

  const profileData = {
    // Basic profile information
    location: data.location?.trim() || null,

    education: education || null,

    // Preserve the existing careerGoal field.
    careerGoal: data.targetJobTitle.trim(),

    // Career information
    targetJobTitle: data.targetJobTitle.trim(),

    industryFocus: data.industryFocus.trim(),

    careerStage,

    primaryGoal: data.primaryGoal,

    // Salary preferences
    payMin: minimumSalary,

    payMax: maximumSalary,

    // Preferred work arrangement
    workMode: data.workMode || null,
  };

  // Save locally as incomplete until the API succeeds.
  save(false);

  const submitButton = form.querySelector(
    '[type="submit"]'
  );

  const stopLoading =
    window.SkillBridgeApi.setLoading(
      submitButton,
      "Saving and continuing…"
    );

  try {
    // -----------------------------------------------
    // Save the profile to the backend
    // -----------------------------------------------

    await window.SkillBridgeApi.put(
      "/api/v1/profiles/me",
      profileData
    );

    // Mark the survey as completed only after
    // the backend successfully saves the profile.
    save(true);

    // -----------------------------------------------
    // Continue to CV upload
    // -----------------------------------------------

    window.location.href = "cv-upload.html";

  } catch (error) {
    showError(
      `Could not save your answers to your account: ${error.message}`
    );

  } finally {
    stopLoading();
  }
});

// =====================================================
// 7. RESTORE PREVIOUS ANSWERS
// =====================================================

restore();
