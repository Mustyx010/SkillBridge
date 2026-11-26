
const fullName =
  window.SkillBridgeApi.session()?.user?.fullName || "Candidate";

const givenName = fullName.trim().split(/\s+/)[0] || "Candidate";
const familyName = fullName.trim().split(/\s+/).at(-1) || "";

document.getElementById("roadmap-user-name").textContent =
  `${givenName} ${
    familyName && familyName !== givenName
      ? `${familyName[0]}.`
      : ""
  }`;

document.title = "Career Roadmap | SkillBridge";

document.querySelector("header span.ml-auto")?.remove();

// =====================================================
// 1. SIDEBAR NAVIGATION
// =====================================================

const sidebar = document.getElementById("roadmap-sidebar");
const backdrop = document.getElementById("roadmap-backdrop");
const menuButton = document.getElementById("roadmap-menu-button");

const setSidebarOpen = (open) => {
  sidebar.classList.toggle("-translate-x-full", !open);
  backdrop.classList.toggle("hidden", !open);

  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation"
  );
};

menuButton.addEventListener("click", () =>
  setSidebarOpen(menuButton.getAttribute("aria-expanded") !== "true")
);

backdrop.addEventListener("click", () => setSidebarOpen(false));

sidebar.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setSidebarOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSidebarOpen(false);
  }
});

// =====================================================
// 2. ROADMAP SEARCH
// =====================================================

const searchForm = document.getElementById("roadmap-search-form");
const searchInput = document.getElementById("roadmap-search");

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (query) {
    window.location.href =
      `opportunities.html?q=${encodeURIComponent(query)}`;
  }
});

// =====================================================
// 3. NOTIFICATIONS
// =====================================================

document
  .getElementById("roadmap-notifications")
  .addEventListener("click", () => {
    const dialog = document.createElement("dialog");

    dialog.className =
      "w-[min(92vw,420px)] rounded-2xl border-0 p-6 text-[#181445] shadow-2xl backdrop:bg-[#181445]/40";

    dialog.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold">Notifications</h2>
          <p class="mt-2 text-sm leading-6 text-[#625B6D]">
            You’re all caught up. Sprint and mentor updates will appear here.
          </p>
        </div>

        <button
          type="button"
          class="text-xl"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    `;

    document.body.append(dialog);

    dialog.querySelector("button").addEventListener("click", () => {
      dialog.close();
      dialog.remove();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
        dialog.remove();
      }
    });

    dialog.showModal();
  });

// =====================================================
// 4. ROADMAP NOTIFICATION MESSAGE
// =====================================================

const roadmapNotice = (message) => {
  let notice = document.getElementById("roadmap-notice");

  if (!notice) {
    notice = document.createElement("div");

    notice.id = "roadmap-notice";

    notice.className =
      "fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#181445] px-4 py-3 text-sm font-semibold text-white shadow-xl";

    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");

    document.body.append(notice);
  }

  notice.textContent = message;
  notice.classList.remove("hidden");

  clearTimeout(roadmapNotice.timeout);

  roadmapNotice.timeout = setTimeout(() => {
    notice.classList.add("hidden");
  }, 3200);
};

// =====================================================
// 5. ROADMAP API PANEL
// =====================================================

const roadmapMain = document.querySelector(
  'main[aria-label="Personalized career roadmap"]'
);

const roadmapApiPanel = document.createElement("section");

roadmapApiPanel.className =
  "rounded-2xl bg-white p-5 shadow-sm sm:p-6";

roadmapApiPanel.setAttribute(
  "aria-labelledby",
  "api-roadmap-title"
);

roadmapApiPanel.setAttribute("aria-busy", "true");

roadmapMain.replaceChildren(roadmapApiPanel);

const loadingTitle = document.createElement("h2");

loadingTitle.id = "api-roadmap-title";
loadingTitle.className = "text-lg font-bold";
loadingTitle.textContent = "Loading your roadmap…";

roadmapApiPanel.append(loadingTitle);

// =====================================================
// 6. RESPONSE HELPERS
// =====================================================

const roadmapsFrom = (response) => {
  const data = window.SkillBridgeApi.unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return data?.id ? [data] : [];
};

const latestFirst = (items) =>
  [...items].sort(
    (a, b) =>
      Date.parse(b.updatedAt || b.createdAt || 0) -
      Date.parse(a.updatedAt || a.createdAt || 0)
  );

const itemsFrom = (response) => {
  const data = window.SkillBridgeApi.unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.items) ? data.items : [];
};

// =====================================================
// 7. DISPLAY EMPTY STATES
// =====================================================

const showEmptyState = ({
  titleText,
  messageText,
  linkHref,
  linkText,
}) => {
  roadmapApiPanel.replaceChildren();

  const title = document.createElement("h2");

  title.id = "api-roadmap-title";
  title.className = "text-lg font-bold";
  title.textContent = titleText;

  const message = document.createElement("p");

  message.className = "mt-2 text-sm text-[#625B6D]";
  message.textContent = messageText;

  const link = document.createElement("a");

  link.href = linkHref;
  link.className =
    "mt-3 inline-flex font-semibold text-[#731F94] underline";
  link.textContent = linkText;

  roadmapApiPanel.append(title, message, link);
  roadmapApiPanel.setAttribute("aria-busy", "false");
};

// =====================================================
// 8. LOAD PERSONALIZED ROADMAP
// =====================================================

const loadApiRoadmap = async () => {
  try {
    // Check whether the user is signed in.
    if (!window.SkillBridgeApi.session()) {
      showEmptyState({
        titleText: "Sign in to view your roadmap",
        messageText:
          "Your personalized learning roadmap is available after signing in.",
        linkHref: "signin.html",
        linkText: "Sign in",
      });

      return;
    }

    // Fetch the user's roadmaps, CVs, and skill-gap analyses.
    const [
      roadmapResponse,
      cvResponse,
      gapResponse,
    ] = await Promise.all([
      window.SkillBridgeApi.get("/api/v1/roadmaps"),
      window.SkillBridgeApi.get("/api/v1/cvs/my-cvs"),
      window.SkillBridgeApi.get("/api/v1/skill-gaps"),
    ]);

    let roadmaps = roadmapsFrom(roadmapResponse);

    const cvs = itemsFrom(cvResponse);
    const gaps = itemsFrom(gapResponse);

    // -------------------------------------------------
    // 8.1 Find the latest CV
    // -------------------------------------------------

    const latestCv = latestFirst(cvs)[0];

    // -------------------------------------------------
    // 8.2 Find the latest completed SkillGap
    // -------------------------------------------------

    const completedGaps = gaps.filter(
      (gap) => gap.status === "completed"
    );

    // If a latest CV exists, only consider completed
    // analyses linked to that CV.
    const latestGap = latestFirst(
      latestCv
        ? completedGaps.filter(
            (gap) => gap.cvId === latestCv.id
          )
        : completedGaps
    )[0];

    const skillGapId = latestGap?.id;

    // -------------------------------------------------
    // 8.3 Handle missing SkillGap analysis
    // -------------------------------------------------

    if (!skillGapId) {
      showEmptyState({
        titleText: "No completed skill analysis available",
        messageText:
          "Complete your CV skill-gap analysis before generating a learning roadmap.",
        linkHref: "skill-gap.html",
        linkText: "Review your skill-gap analysis",
      });

      return;
    }

    // Keep the stored ID synchronized with the latest
    // completed analysis.
    localStorage.setItem(
      "skillbridgeSkillGapId",
      skillGapId
    );

    // -------------------------------------------------
    // 8.4 Find an existing roadmap for this SkillGap
    // -------------------------------------------------

    let roadmap = latestFirst(
      roadmaps.filter(
        (item) => item.skillGapId === skillGapId
      )
    )[0];

    // -------------------------------------------------
    // 8.5 Generate a roadmap only when one does not exist
    // -------------------------------------------------

    if (!roadmap) {
      try {
        await window.SkillBridgeApi.post(
          "/api/v1/roadmaps/generate",
          { skillGapId }
        );
      } catch (error) {
        if (error.status === 503) {
          throw new Error(
            "The AI service is temporarily busy or unavailable. Your CV analysis is saved. Please try generating your roadmap again in a few minutes."
          );
        }

        throw error;
      }

      // Fetch roadmaps again after successful generation.
      roadmaps = roadmapsFrom(
        await window.SkillBridgeApi.get("/api/v1/roadmaps")
      );

      roadmap = latestFirst(
        roadmaps.filter(
          (item) => item.skillGapId === skillGapId
        )
      )[0];
    }

    if (!roadmap?.id) {
      throw new Error(
        "The API did not return a roadmap ID."
      );
    }

    // -------------------------------------------------
    // 8.6 Fetch the selected roadmap and its tasks
    // -------------------------------------------------

    const response = await window.SkillBridgeApi.get(
      `/api/v1/roadmaps/${encodeURIComponent(roadmap.id)}`
    );

    const data = window.SkillBridgeApi.unwrap(response);

    const roadmapData = data?.roadmap || data;
    const tasksByPhase = data?.tasksByPhase || {};

    const tasks = Array.isArray(roadmapData?.tasks)
      ? roadmapData.tasks
      : [30, 60, 90].flatMap((phase) =>
          (tasksByPhase[String(phase)] || []).map(
            (task) => ({
              ...task,
              phase,
            })
          )
        );

    // -------------------------------------------------
    // 8.7 Display roadmap information
    // -------------------------------------------------

    roadmapApiPanel.replaceChildren();

    const title = document.createElement("h2");

    title.id = "api-roadmap-title";
    title.className = "text-lg font-bold";

    title.textContent =
      roadmapData.title ||
      roadmap.title ||
      "Your roadmap";

    const subtitle = document.createElement("p");

    subtitle.className =
      "mt-1 text-sm text-[#625B6D]";

    subtitle.textContent =
      `${roadmapData.targetRole || roadmap.targetRole || "Career goal"} • ${
        roadmapData.status || roadmap.status || "status unavailable"
      }`;

    roadmapApiPanel.append(title, subtitle);

    document.title =
      `${title.textContent} | SkillBridge`;

    const summary = document.createElement("p");

    summary.className =
      "mt-2 text-sm leading-6 text-[#625B6D]";

    summary.textContent =
      roadmapData.summary ||
      roadmap.summary ||
      "";

    roadmapApiPanel.append(summary);

    // -------------------------------------------------
// Calculate and display overall roadmap progress
// -------------------------------------------------

const progressContainer = document.createElement("div");
progressContainer.className = "mt-5";

const progressHeader = document.createElement("div");
progressHeader.className =
  "mb-2 flex items-center justify-between text-sm";

const progressLabel = document.createElement("span");
progressLabel.className = "font-semibold";
progressLabel.textContent = "Overall roadmap progress";

const progressValue = document.createElement("span");
progressValue.className = "font-bold text-[#731F94]";

const progressTrack = document.createElement("div");
progressTrack.className =
  "h-2 overflow-hidden rounded-full bg-[#EDE7F3]";

const progressBar = document.createElement("div");
progressBar.className =
  "h-full rounded-full bg-[#731F94] transition-all duration-300";

progressTrack.append(progressBar);
progressHeader.append(progressLabel, progressValue);
progressContainer.append(progressHeader, progressTrack);

roadmapApiPanel.append(progressContainer);

const updateRoadmapProgress = () => {
  const completedTasks = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const percentage = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  progressValue.textContent =
    `${percentage}% (${completedTasks}/${tasks.length} tasks)`;

  progressBar.style.width = `${percentage}%`;
};

// Display the initial progress.
updateRoadmapProgress();

    // -------------------------------------------------
    // 8.8 Handle missing roadmap tasks
    // -------------------------------------------------

    if (!tasks.length) {
      window.SkillBridgeApi.showStatus(
        roadmapApiPanel,
        "The API returned roadmap details but no task list. Task progress can appear here when the backend includes roadmap tasks in its response."
      );

      roadmapApiPanel.setAttribute(
        "aria-busy",
        "false"
      );

      return;
    }

    subtitle.textContent +=
      ` • ${tasks.length} API tasks`;

    // -------------------------------------------------
    // 8.9 Render roadmap tasks
    // -------------------------------------------------

    const taskList = document.createElement("div");

    taskList.className =
      "mt-4 grid gap-3 md:grid-cols-2";

    tasks.forEach((task) => {
      const item = document.createElement("article");

      item.className =
        "rounded-xl bg-[#F8F4FF] p-4";

      const phase = document.createElement("p");

      phase.className =
        "text-[10px] font-bold uppercase text-[#731F94]";

      const phaseLabels = {
          30: "Phase 1 — Days 1–30: Foundation",
          60: "Phase 2 — Days 31–60: Skill Development",
          90: "Phase 3 — Days 61–90: Practical Application",
      };

      phase.textContent =
        `${phaseLabels[Number(task.phase)] || `Phase ${task.phase}`} • ${
          task.taskType || "task"
        }`;

      const taskTitle = document.createElement("h3");

      taskTitle.className =
        "mt-1 text-sm font-semibold";

      taskTitle.textContent =
        task.title || "Untitled task";

      const description = document.createElement("p");

      description.className =
        "mt-1 text-xs leading-5 text-[#625B6D]";

      description.textContent =
        task.description || "";

      const status = document.createElement("p");

      status.className =
        "mt-2 text-[10px] font-semibold text-[#625B6D]";

      status.textContent =
        `Status: ${task.status || "todo"}`;

      const updateButton = document.createElement("button");

      updateButton.type = "button";

      updateButton.className =
        "mt-3 rounded-lg bg-[#731F94] px-3 py-2 text-xs font-semibold text-white";

      updateButton.textContent =
        task.status === "done"
          ? "Reopen task"
          : "Mark complete";

      // -------------------------------------------------
      // 8.10 Update task completion status
      // -------------------------------------------------

      updateButton.addEventListener(
        "click",
        async () => {
          const stopLoading =
            window.SkillBridgeApi.setLoading(
              updateButton,
              "Updating task…"
            );

          try {
            const nextStatus =
              task.status === "done"
                ? "todo"
                : "done";

            await window.SkillBridgeApi.patch(
              `/api/v1/roadmaps/${encodeURIComponent(
                roadmap.id
              )}/tasks/${encodeURIComponent(task.id)}`,
              {
                status: nextStatus,
              }
            );

          task.status = nextStatus;

          status.textContent =
            `Status: ${nextStatus}`;

          // Recalculate overall roadmap progress.
          updateRoadmapProgress();

            updateButton.textContent =
              nextStatus === "done"
                ? "Reopen task"
                : "Mark complete";

          } catch (error) {
            roadmapNotice(
              `Could not update task: ${error.message}`
            );

          } finally {
            stopLoading();

            updateButton.textContent =
              task.status === "done"
                ? "Reopen task"
                : "Mark complete";
          }
        }
      );

      item.append(
        phase,
        taskTitle,
        description,
        status,
        updateButton
      );

      taskList.append(item);
    });

    roadmapApiPanel.append(taskList);

    roadmapApiPanel.setAttribute(
      "aria-busy",
      "false"
    );

  } catch (error) {
    roadmapApiPanel.setAttribute(
      "aria-busy",
      "false"
    );

    window.SkillBridgeApi.showStatus(
      roadmapApiPanel,
      `Your roadmap could not be loaded: ${error.message}`,
      true
    );
  }
};

// =====================================================
// 9. INITIALIZE ROADMAP PAGE
// =====================================================

loadApiRoadmap();
