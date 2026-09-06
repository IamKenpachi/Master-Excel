// app.js - Main Application Orchestrator, Router & Interactive Test Controller

import { EXCEL_TOPICS, DIFFICULTY_CONFIG } from "./prompts.js";
import { Storage, DEFAULT_MODEL, SAMPLE_OFFLINE_TEST, AVAILABLE_MODELS, loadEnvConfig } from "./storage.js";
import { Datasets } from "./datasets.js";
import { Gemini } from "./gemini.js";
import { Exporter } from "./export.js";

// Global Application State
const state = {
  activeScreen: "screen-generator",
  difficulty: "intermediate",
  taskCount: 15,
  datasetLimit: 3,
  datasetStrategy: "find_real", // "find_real" | "synthetic"
  selectedTopics: [], // Empty means all topics
  rankedDatasets: [],
  selectedDataset: null,
  currentTest: null,
  taskProgress: {}, // { [taskNum]: { done: false, rating: 'Easy'|'Fair'|'Hard', notes: '' } }
  timer: {
    intervalId: null,
    totalSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    isRunning: false
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadEnvConfig();
  initUI();
  initEventListeners();
  loadSavedSettings();
  renderTopicChips();
  renderDrillTopicSelect();
  updateProgressDashboard();

  // If there's an active test in session, prompt or restore it
  const cachedTest = Storage.getActiveTest();
  if (cachedTest && cachedTest.test) {
    loadTestIntoView(cachedTest, false);
  }
});

/**
 * Initialize DOM controls and default states
 */
function initUI() {
  updateDifficultyMeta(state.difficulty);

  // Task count slider
  const taskSlider = document.getElementById("slider-task-count");
  const taskSliderVal = document.getElementById("slider-task-count-val");
  if (taskSlider && taskSliderVal) {
    taskSlider.value = state.taskCount;
    taskSlider.addEventListener("input", (e) => {
      state.taskCount = parseInt(e.target.value, 10);
      const estMins = Math.round(state.taskCount * 3.5);
      taskSliderVal.textContent = `${state.taskCount} Tasks (~${estMins}m)`;
      updateDifficultyMeta(state.difficulty);
    });
  }

  // Strategy select toggle
  const strategySelect = document.getElementById("select-dataset-strategy");
  const searchControls = document.getElementById("real-dataset-search-controls");
  const sourceCheckboxes = document.getElementById("dataset-source-checkboxes");

  strategySelect.addEventListener("change", (e) => {
    state.datasetStrategy = e.target.value;
    if (state.datasetStrategy === "find_real") {
      searchControls.style.display = "block";
      if (sourceCheckboxes) sourceCheckboxes.style.display = "flex";
    } else {
      searchControls.style.display = "none";
      if (sourceCheckboxes) sourceCheckboxes.style.display = "none";
      document.getElementById("ranked-datasets-section").style.display = "none";
    }
  });

  // Check if Gemini key is set to update banner notice
  const geminiKey = Storage.getGeminiKey();
  const noticeBanner = document.getElementById("banner-api-notice");
  if (geminiKey) {
    noticeBanner.style.display = "none";
  }
}

/**
 * Switch Screen Tabs
 */
function switchScreen(screenId) {
  state.activeScreen = screenId;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add("active");

  const activeTabBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (activeTabBtn) activeTabBtn.classList.add("active");

  if (screenId === "screen-progress") {
    updateProgressDashboard();
  }

  if (screenId === "screen-answers") {
    if (state.currentTest) {
      renderAnswerKey(state.currentTest);
    } else {
      const cached = Storage.getActiveTest();
      if (cached && (cached.test || cached.tasks)) {
        loadTestIntoView(cached, false);
      } else {
        renderEmptyAnswerKey();
      }
    }
  }
}

/**
 * Render Excel Topic filter chips in generator
 */
function renderTopicChips() {
  const container = document.getElementById("topic-chips-wrapper");
  container.innerHTML = "";

  EXCEL_TOPICS.forEach(topic => {
    const chip = document.createElement("div");
    chip.className = "topic-chip";
    chip.dataset.id = topic.id;
    chip.textContent = `${topic.name} (${topic.badge})`;

    chip.addEventListener("click", () => {
      const idx = state.selectedTopics.indexOf(topic.name);
      if (idx > -1) {
        state.selectedTopics.splice(idx, 1);
        chip.classList.remove("selected");
      } else {
        state.selectedTopics.push(topic.name);
        chip.classList.add("selected");
      }

      const countLabel = document.getElementById("selected-topics-count");
      countLabel.textContent = state.selectedTopics.length === 0
        ? "All 12 Categories Active"
        : `${state.selectedTopics.length} Custom Topics Filtered`;
    });

    container.appendChild(chip);
  });
}

/**
 * Populate Quick Drill topic dropdown
 */
function renderDrillTopicSelect() {
  const select = document.getElementById("select-drill-topic");
  select.innerHTML = "";
  EXCEL_TOPICS.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = `${t.name} (${t.skills.slice(0, 3).join(", ")}...)`;
    select.appendChild(opt);
  });
}

/**
 * Update difficulty labels and timer estimate
 */
function updateDifficultyMeta(diffKey) {
  const config = DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.intermediate;
  const label = document.getElementById("label-diff-meta");
  const count = state.taskCount || config.taskCount;
  const estMinutes = Math.round(count * 3.5);

  if (label) {
    label.textContent = `${config.label.split(" ")[0]} • ${count} tasks • ${estMinutes}m`;
    label.style.color = config.color;
  }
  const skillsBox = document.getElementById("diff-expected-skills");
  if (skillsBox && config.expectedSkills) {
    skillsBox.textContent = config.expectedSkills.join(", ") + ".";
  }
  state.timer.totalSeconds = estMinutes * 60;
  state.timer.remainingSeconds = state.timer.totalSeconds;
}

/**
 * Search Hugging Face and/or Kaggle based on checkboxes and rank via Gemini
 */
async function performDatasetSearchAndRank() {
  const query = document.getElementById("input-dataset-query").value.trim() || "retail transactions";
  const useHF = document.getElementById("check-source-hf")?.checked ?? true;
  const useKaggle = document.getElementById("check-source-kaggle")?.checked ?? true;
  const limitInput = document.getElementById("input-dataset-limit");
  const limit = limitInput ? parseInt(limitInput.value, 10) || 3 : 3;
  state.datasetLimit = limit;

  if (!useHF && !useKaggle) {
    alert("Please select at least one dataset source: Hugging Face or Kaggle.");
    document.getElementById("check-source-hf").checked = true;
    return;
  }

  const { username, key } = Storage.getKaggleCredentials();
  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();

  const section = document.getElementById("ranked-datasets-section");
  const cardsContainer = document.getElementById("ranked-datasets-cards");
  const statusText = document.getElementById("generation-status-text");

  const sourceLabels = [];
  if (useHF) sourceLabels.push("Hugging Face");
  if (useKaggle) sourceLabels.push("Kaggle");
  const sourceText = sourceLabels.join(" & ");

  section.style.display = "block";
  cardsContainer.innerHTML = `
    <div class="loading-indicator" style="grid-column: 1 / -1;">
      <div class="spinner"></div>
      <p style="color: var(--text-primary); font-weight: 600;">Searching ${sourceText}...</p>
      <p style="color: var(--text-muted); font-size: 0.85rem;">Gemini will rank top ${limit} candidates by relevance to your test.</p>
    </div>
  `;

  try {
    statusText.textContent = `Querying ${sourceText}...`;
    const candidates = await Datasets.searchAll({
      query,
      useHF,
      useKaggle,
      kaggleUser: username,
      kaggleKey: key,
      limit: Math.max(limit * 2, 12)
    });

    statusText.textContent = `Gemini is ranking top ${limit} candidates for Excel mock test relevance...`;
    const rankedResults = await Gemini.rankDatasets({
      candidates,
      difficulty: state.difficulty,
      topics: state.selectedTopics.join(", "),
      apiKey,
      model,
      limit
    });

    state.rankedDatasets = rankedResults;
    renderRankedDatasetCards(rankedResults);
    statusText.textContent = `Found and ranked ${rankedResults.length} premier datasets from ${sourceText}! Click 'Select' or generate directly.`;
  } catch (err) {
    console.error("Dataset ranking error:", err);
    cardsContainer.innerHTML = `
      <div style="grid-column:1/-1; padding:1.5rem; background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); border-radius:var(--radius-md); color:#FECDD3;">
        <strong>Notice:</strong> Unable to rank live datasets: ${err.message}. Showing curated enterprise dataset options.
      </div>
    `;
  }
}

/**
 * Render Top 3 Ranked Dataset Cards
 */
function renderRankedDatasetCards(datasets) {
  const container = document.getElementById("ranked-datasets-cards");
  container.innerHTML = "";

  const rankBadges = [
    { label: "🏆 #1 Top Match", class: "gold" },
    { label: "🥈 #2 Strong Match", class: "silver" },
    { label: "🥉 #3 Good Fit", class: "bronze" }
  ];

  datasets.forEach((ds, idx) => {
    const badgeInfo = rankBadges[idx] || { label: `🎖️ #${idx + 1} Candidate`, class: "" };
    const card = document.createElement("div");
    card.className = "dataset-card";
    if (state.selectedDataset && state.selectedDataset.id === ds.id) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <div>
        <span class="dataset-rank-badge ${badgeInfo.class}">${badgeInfo.label} • Score: ${ds.score || "9.0"}/10</span>
        <div class="dataset-source-tag">${ds.source}</div>
        <h4 class="dataset-title">${ds.title}</h4>
        <p class="dataset-why">${ds.whyGreat || ds.description}</p>
      </div>

      <div class="dataset-footer">
        <a href="${ds.url}" target="_blank" rel="noopener noreferrer" class="dataset-link-btn" title="Open dataset in a new window">
          Open on ${ds.source} ↗
        </a>
        <button class="btn btn-outline-green btn-select-ds" style="font-size: 0.78rem; padding: 4px 10px;">
          ${state.selectedDataset && state.selectedDataset.id === ds.id ? "✓ Selected" : "Select Dataset"}
        </button>
      </div>
    `;

    const selectBtn = card.querySelector(".btn-select-ds");
    selectBtn.addEventListener("click", () => {
      state.selectedDataset = ds;
      document.querySelectorAll(".dataset-card").forEach(c => c.classList.remove("selected"));
      document.querySelectorAll(".btn-select-ds").forEach(b => b.textContent = "Select Dataset");
      card.classList.add("selected");
      selectBtn.textContent = "✓ Selected";
      document.getElementById("generation-status-text").textContent = `Selected: "${ds.title}". Gemini will calibrate tasks around this schema.`;
    });

    container.appendChild(card);
  });
}

/**
 * Handle Full Test Generation
 */
async function handleGenerateTest() {
  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();
  const statusText = document.getElementById("generation-status-text");
  const genBtn = document.getElementById("btn-generate-test");

  genBtn.disabled = true;
  genBtn.innerHTML = `<span>⏳</span> Generating Mock Test...`;
  statusText.textContent = "Connecting to Gemini AI Engine... Crafting realistic business scenario and tasks...";

  try {
    let datasetMeta = null;

    // If "Find real dataset" is chosen and user selected a dataset
    if (state.datasetStrategy === "find_real") {
      if (!state.selectedDataset && state.rankedDatasets.length > 0) {
        state.selectedDataset = state.rankedDatasets[0]; // default to #1 top match
      }

      if (state.selectedDataset) {
        statusText.textContent = `Extracting schema for ${state.selectedDataset.title}...`;
        if (state.selectedDataset.source === "Hugging Face" && (!state.selectedDataset.columns || state.selectedDataset.columns.length === 0)) {
          const hfInfo = await Datasets.fetchHFSchema(state.selectedDataset.id);
          if (hfInfo) {
            state.selectedDataset.columns = hfInfo.columns;
            state.selectedDataset.rowCount = hfInfo.rowCount;
          }
        }

        datasetMeta = {
          name: state.selectedDataset.title,
          source: state.selectedDataset.source,
          url: state.selectedDataset.url,
          rowCount: state.selectedDataset.rowCount || "10,000+",
          description: state.selectedDataset.description,
          columns: state.selectedDataset.columns || []
        };
      }
    }

    statusText.textContent = `Gemini is generating complete ${state.difficulty} test (${state.taskCount} tasks) and answer key in one pass...`;

    const testPayload = await Gemini.generateTest({
      difficulty: state.difficulty,
      topics: state.selectedTopics,
      datasetMeta,
      taskCount: state.taskCount,
      apiKey,
      model
    });

    // Save test in storage & state
    loadTestIntoView(testPayload, true);
    statusText.textContent = "Test generated successfully!";
  } catch (err) {
    console.error("Test generation failed:", err);
    alert(`Generation Error: ${err.message}\n\nTip: You can load the built-in offline test without an API key!`);
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    genBtn.disabled = false;
    genBtn.innerHTML = `<span>✨</span> Generate Full Mock Test`;
  }
}

/**
 * HTML Escaping helper to safely output formulas containing <, >, &, etc.
 */
function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Load a generated or cached test into the active test view
 */
function loadTestIntoView(testPayload, saveToHistory = true) {
  if (!testPayload) return;

  // Handle bare test objects
  if (!testPayload.test && testPayload.tasks) {
    testPayload = {
      test: testPayload,
      answerKey: testPayload.answerKey || [],
      syntheticCsv: testPayload.syntheticCsv || "",
      modelUsed: testPayload.modelUsed || "Gemini"
    };
  }

  const test = testPayload.test;
  if (!test) return;

  // Ensure answerKey array exists at root level
  if (!Array.isArray(testPayload.answerKey)) {
    testPayload.answerKey = Array.isArray(test.answerKey) ? test.answerKey : [];
  }

  // Normalize all tasks so task.number & task.no are guaranteed numbers
  if (Array.isArray(test.tasks)) {
    test.tasks.forEach((task, idx) => {
      const num = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
      task.number = num;
      task.no = num;
    });
  }

  // Normalize all answerKey solutions so sol.taskNumber, sol.taskNo are guaranteed numbers
  if (Array.isArray(testPayload.answerKey)) {
    testPayload.answerKey.forEach((sol, idx) => {
      const num = parseInt(sol.taskNumber || sol.taskNo || sol.task_no || sol.no || sol.number || (idx + 1), 10);
      sol.taskNumber = num;
      sol.taskNo = num;
      sol.number = num;
      sol.answer = sol.answer || sol.solution || sol.formula || sol.exactFormula || "";
      sol.explanation = sol.explanation || sol.rationale || "";
      sol.proTip = sol.proTip || sol.tip || sol.bestPractice || "Always favor dynamic references over fixed cell ranges.";
      sol.interviewTalkingPoint = sol.interviewTalkingPoint || sol.talkingPoint || sol.interview || "Explain the trade-offs and performance benefits aloud to showcase senior analytical maturity.";
    });
    testPayload.answerKey.sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0));
  }

  state.currentTest = testPayload;
  state.taskProgress = testPayload.taskProgress || {};
  Storage.setActiveTest(testPayload);

  if (saveToHistory) {
    Storage.saveTestToHistory({
      id: testPayload.test.id,
      date: new Date().toISOString(),
      test: testPayload.test,
      answerKey: testPayload.answerKey,
      syntheticCsv: testPayload.syntheticCsv,
      taskProgress: state.taskProgress,
      modelUsed: testPayload.modelUsed
    });
  }

  // Update Header Bar
  document.getElementById("test-view-title").textContent = test.title;
  document.getElementById("answers-view-title").textContent = `${test.title} — Solution Guide`;
  document.getElementById("test-diff-badge").textContent = test.difficultyLabel || test.difficulty;
  document.getElementById("test-industry-badge").textContent = test.scenario?.industry || "Business";
  document.getElementById("test-model-badge").textContent = testPayload.modelUsed || "Gemini";

  // Scenario Box
  document.getElementById("test-scenario-background").textContent = test.scenario?.background || "Technical interview case study.";
  document.getElementById("test-scenario-objective").innerHTML = `<strong>Objective:</strong> ${test.scenario?.objective || "Analyze the dataset and answer all tasks according to standard business reporting practices."}`;

  // Dataset Action Buttons
  const downloadBtn = document.getElementById("btn-download-csv");
  const datasetLink = document.getElementById("btn-open-dataset-link");

  const csvContent = test.syntheticCsv || testPayload.syntheticCsv;
  if (csvContent && csvContent.trim().length > 10) {
    downloadBtn.style.display = "inline-flex";
    downloadBtn.onclick = () => {
      const company = test.scenario?.company || "Excel_Interview";
      const filename = `${company.replace(/\s+/g, "_")}_Data.csv`;
      Exporter.downloadCSV(csvContent, filename);
    };
  } else {
    downloadBtn.style.display = "none";
  }

  if (state.selectedDataset && state.selectedDataset.url) {
    datasetLink.style.display = "inline-flex";
    datasetLink.href = state.selectedDataset.url;
  } else {
    datasetLink.style.display = "none";
  }

  // Render Table Rows
  renderTasksTable(test.tasks);

  // Render Solutions in Answer Key screen
  renderAnswerKey(testPayload);

  // Reset and start countdown timer
  const minutes = test.estimatedMinutes || 45;
  state.timer.totalSeconds = minutes * 60;
  state.timer.remainingSeconds = state.timer.totalSeconds;
  startTimer();

  // Indicate active test in navbar
  document.getElementById("active-test-indicator").style.display = "inline-block";

  // Switch to Active Test Screen
  switchScreen("screen-test");
}

/**
 * Render tasks table in the screenshot-style worksheet
 */
function renderTasksTable(tasks) {
  const tbody = document.getElementById("test-tasks-tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(tasks) || tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">No tasks found for this test.</td></tr>`;
    return;
  }

  tasks.forEach((task, idx) => {
    const taskNum = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
    task.number = taskNum;
    task.no = taskNum;

    const row = document.createElement("tr");
    row.className = "task-row";
    row.id = `task-row-${taskNum}`;

    const savedProg = state.taskProgress[taskNum] || { done: false, rating: "" };
    if (savedProg.done) row.classList.add("completed");

    row.innerHTML = `
      <td class="task-no-cell">${taskNum}</td>
      <td class="task-instruction-cell">
        <span class="task-category-tag">${escapeHtml(task.category || "Excel")}</span>
        <strong>${escapeHtml(task.instruction || "")}</strong>
        <div class="hint-box" id="hint-box-${taskNum}">${escapeHtml(task.hint || "Review Excel formulas and best practices.")}</div>
      </td>
      <td class="task-action-cell">
        <div class="task-status-row">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem;">
            <input type="checkbox" class="task-checkbox" data-num="${taskNum}" ${savedProg.done ? "checked" : ""}>
            <span>Done</span>
          </label>
          <div class="rating-buttons">
            <button class="rating-btn easy ${savedProg.rating === "Easy" ? "active" : ""}" data-num="${taskNum}" data-val="Easy" title="Felt easy">Easy</button>
            <button class="rating-btn fair ${savedProg.rating === "Fair" ? "active" : ""}" data-num="${taskNum}" data-val="Fair" title="Moderate challenge">Fair</button>
            <button class="rating-btn hard ${savedProg.rating === "Hard" ? "active" : ""}" data-num="${taskNum}" data-val="Hard" title="Struggled / Need review">Hard</button>
          </div>
          <button class="btn btn-icon btn-hint-toggle" data-num="${taskNum}" title="Show / Hide Hint" style="width:28px; height:28px; font-size:0.8rem;">
            💡
          </button>
        </div>
      </td>
    `;

    // Row click updates formula bar mock
    row.addEventListener("click", () => {
      document.getElementById("formula-bar-content").textContent = task.instruction || "";
      document.querySelector(".cell-name-box").textContent = `B${taskNum + 6}`;
    });

    // Checkbox toggle
    const checkbox = row.querySelector(".task-checkbox");
    checkbox.addEventListener("change", (e) => {
      const isDone = e.target.checked;
      row.classList.toggle("completed", isDone);
      saveTaskState(taskNum, { done: isDone });
    });

    // Rating buttons
    row.querySelectorAll(".rating-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rating = btn.dataset.val;
        row.querySelectorAll(".rating-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        saveTaskState(taskNum, { rating, category: task.category });
      });
    });

    // Hint toggle - safely scoped to this specific row, 100% reliable across all tasks
    const hintBtn = row.querySelector(".btn-hint-toggle");
    hintBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const hintBox = row.querySelector(".hint-box");
      if (hintBox) {
        hintBox.classList.toggle("visible");
      }
    });

    tbody.appendChild(row);
  });
}

function saveTaskState(taskNum, partial) {
  state.taskProgress[taskNum] = {
    ...(state.taskProgress[taskNum] || {}),
    ...partial
  };
  if (state.currentTest) {
    state.currentTest.taskProgress = state.taskProgress;
    Storage.setActiveTest(state.currentTest);
    Storage.saveTestToHistory(state.currentTest);
  }
}

/**
 * Render Empty Answer Key Placeholder
 */
function renderEmptyAnswerKey() {
  const container = document.getElementById("solutions-container");
  if (!container) return;
  document.getElementById("answers-view-title").textContent = "Solution Guide";
  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--glass-border);">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">💡</div>
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-bright);">No Active Test Loaded</h3>
      <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.5rem; font-size: 0.95rem; line-height: 1.5;">
        Generate a mock test in the Generator tab or load the built-in offline practice test to unlock complete formula solutions, pro tips, and verbatim interview talking points.
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" id="btn-empty-go-gen">
          <span>⚡</span> Go to Generator
        </button>
        <button class="btn btn-secondary" id="btn-empty-load-sample">
          <span>📖</span> Load Offline Practice Test
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-empty-go-gen")?.addEventListener("click", () => switchScreen("screen-generator"));
  document.getElementById("btn-empty-load-sample")?.addEventListener("click", () => loadTestIntoView(SAMPLE_OFFLINE_TEST, true));
}

/**
 * Render Detailed Answer Key & Talking Points
 */
function renderAnswerKey(testPayload) {
  const container = document.getElementById("solutions-container");
  if (!container) return;
  container.innerHTML = "";

  if (!testPayload) {
    renderEmptyAnswerKey();
    return;
  }

  const test = testPayload.test || testPayload;
  if (test.title) {
    const titleEl = document.getElementById("answers-view-title");
    if (titleEl) titleEl.textContent = `${test.title} — Solution Guide`;
  }

  const answerList = testPayload.answerKey || test.answerKey || [];

  if (answerList.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--glass-border);">
        <p style="font-size:1.05rem; margin-bottom:0.5rem; color:var(--text-primary);">No solutions available yet for this test.</p>
        <p style="font-size:0.88rem;">Solutions are automatically generated alongside tests. Generate a test to unlock all formulas and interview talking points.</p>
      </div>
    `;
    return;
  }

  answerList.forEach((sol, idx) => {
    const taskNum = parseInt(sol.taskNumber || sol.taskNo || sol.task_no || sol.no || sol.number || (idx + 1), 10);
    sol.taskNumber = taskNum;
    sol.taskNo = taskNum;

    const answerFormula = sol.answer || sol.solution || sol.formula || "Formula or ribbon steps not specified.";
    const explanation = sol.explanation || sol.rationale || "Follow standard Excel calculation and formatting conventions.";
    const proTip = sol.proTip || sol.tip || "Always favor dynamic references over fixed cell ranges.";
    const talkingPoint = sol.interviewTalkingPoint || sol.talkingPoint || "Explain the trade-offs and performance benefits aloud to showcase senior analytical maturity.";

    const card = document.createElement("div");
    card.className = "solution-card";
    card.innerHTML = `
      <div class="solution-header">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span class="solution-number-badge">${taskNum}</span>
          <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-bright);">Task ${taskNum} Solution</h4>
        </div>
        <span class="task-category-tag">${escapeHtml(sol.category || "Excel")}</span>
      </div>

      <div class="solution-formula-box">
        <code>${escapeHtml(answerFormula)}</code>
        <button class="btn btn-icon copy-ans-btn" data-text="${encodeURIComponent(answerFormula)}" title="Copy Formula" style="width:30px; height:30px; font-size:0.75rem; flex-shrink:0; margin-left:0.5rem;">
          📋
        </button>
      </div>

      <p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.55;">
        ${escapeHtml(explanation)}
      </p>

      <div class="solution-meta-grid">
        <div class="solution-tip-box">
          <strong style="color: var(--accent-amber); display:block; margin-bottom: 0.35rem;">💡 Pro Best-Practice Tip:</strong>
          <span>${escapeHtml(proTip)}</span>
        </div>
        <div class="solution-interview-box">
          <strong style="color: var(--accent-purple); display:block; margin-bottom: 0.35rem;">🎙️ What to Say in the Interview:</strong>
          <span>${escapeHtml(talkingPoint)}</span>
        </div>
      </div>
    `;

    // Copy formula helper
    const copyBtn = card.querySelector(".copy-ans-btn");
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(decodeURIComponent(copyBtn.dataset.text));
      copyBtn.textContent = "✓";
      setTimeout(() => copyBtn.textContent = "📋", 1500);
    });

    container.appendChild(card);
  });
}

/**
 * Countdown Timer
 */
function startTimer() {
  stopTimer();
  state.timer.isRunning = true;
  updateTimerDisplay();

  state.timer.intervalId = setInterval(() => {
    if (state.timer.remainingSeconds > 0) {
      state.timer.remainingSeconds--;
      updateTimerDisplay();
    } else {
      stopTimer();
      alert("⏱️ Time is up! You have reached the target completion time for this test.");
    }
  }, 1000);
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  state.timer.isRunning = false;
  const toggleIcon = document.getElementById("timer-toggle-icon");
  if (toggleIcon) toggleIcon.textContent = "▶️";
}

function toggleTimer() {
  if (state.timer.isRunning) {
    stopTimer();
  } else {
    state.timer.isRunning = true;
    startTimer();
    document.getElementById("timer-toggle-icon").textContent = "⏸️";
  }
}

function updateTimerDisplay() {
  const display = document.getElementById("test-timer-display");
  const text = document.getElementById("timer-text");
  const m = Math.floor(state.timer.remainingSeconds / 60);
  const s = state.timer.remainingSeconds % 60;
  text.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  if (state.timer.remainingSeconds < 300) {
    display.classList.add("urgent");
  } else {
    display.classList.remove("urgent");
  }
}

/**
 * Update Progress Dashboard & Analytics
 */
function updateProgressDashboard() {
  const stats = Storage.getProgressStats();
  document.getElementById("stat-total-tests").textContent = stats.totalTests;
  document.getElementById("stat-minutes-practiced").textContent = `${stats.totalMinutesPracticed}m`;

  let maxDiff = "Intermediate";
  let maxCount = -1;
  Object.entries(stats.difficultyCounts).forEach(([diff, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxDiff = diff.charAt(0).toUpperCase() + diff.slice(1);
    }
  });
  document.getElementById("stat-favorite-diff").textContent = maxDiff;

  // Weak category detection
  let weakRec = "Power Query & Lookups";
  const weakEntries = Object.entries(stats.weakCategories);
  if (weakEntries.length > 0) {
    weakEntries.sort((a, b) => b[1] - a[1]);
    weakRec = weakEntries[0][0];
  }
  document.getElementById("stat-weak-recommendation").textContent = weakRec;

  // History table
  const historyContainer = document.getElementById("history-table-container");
  const history = Storage.getHistory();

  if (history.length === 0) {
    historyContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No tests saved yet. Generate your first mock test to see your history!</p>`;
    return;
  }

  const rows = history.map(item => {
    const t = item.test || item;
    const dateStr = item.date ? new Date(item.date).toLocaleDateString() : "Recent";
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.85rem; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.9rem;">
        <div>
          <strong style="color:var(--text-bright);">${t.title}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
            ${dateStr} • ${t.difficultyLabel || t.difficulty} • ${t.tasks?.length || 12} tasks
          </div>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-reload-test" data-id="${item.id || t.id}" style="font-size:0.78rem; padding:4px 10px;">Load</button>
          <button class="btn btn-secondary btn-del-test" data-id="${item.id || t.id}" style="font-size:0.78rem; padding:4px 8px; color:var(--accent-rose);">✕</button>
        </div>
      </div>
    `;
  }).join("");

  historyContainer.innerHTML = rows;

  historyContainer.querySelectorAll(".btn-reload-test").forEach(btn => {
    btn.addEventListener("click", () => {
      const found = Storage.getTestById(btn.dataset.id);
      if (found) {
        loadTestIntoView(found, false);
      }
    });
  });

  historyContainer.querySelectorAll(".btn-del-test").forEach(btn => {
    btn.addEventListener("click", () => {
      Storage.deleteTestFromHistory(btn.dataset.id);
      updateProgressDashboard();
    });
  });
}

/**
 * Handle Quick Drill Mode
 */
async function handleStartDrill() {
  const topicName = document.getElementById("select-drill-topic").value;
  const topic = EXCEL_TOPICS.find(t => t.name === topicName) || EXCEL_TOPICS[0];
  const container = document.getElementById("drill-questions-container");
  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();

  // Show active dataset context tag if a dataset is selected or ranked
  const contextTag = document.getElementById("drill-dataset-context-tag");
  const contextName = document.getElementById("drill-active-dataset-name");
  const activeDataset = state.selectedDataset || (state.rankedDatasets && state.rankedDatasets[0]);

  if (activeDataset && contextTag && contextName) {
    contextTag.style.display = "block";
    contextName.textContent = `${activeDataset.title} (${activeDataset.source})`;
  } else if (contextTag) {
    contextTag.style.display = "none";
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="loading-indicator">
      <div class="spinner"></div>
      <p style="color: var(--text-primary); font-weight: 600;">Gemini is crafting 5 creative interview questions for ${topic.name}...</p>
      <p style="color: var(--text-muted); font-size: 0.85rem;">Designing bug diagnoses, performance trade-offs, and verbatim interview roleplay.</p>
    </div>
  `;

  try {
    const questions = await Gemini.generateDrillQuestions({
      topic: topic.name,
      datasetMeta: activeDataset,
      difficulty: state.difficulty,
      apiKey,
      model,
      count: 5
    });

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700;">
          🎯 ${topic.name} — Technical Interview Drill
        </h3>
        <span class="brand-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--excel-green); border-color: rgba(16, 185, 129, 0.3);">
          5 Questions • Instant Reveal
        </span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${questions.map((q, i) => {
          const badgeClass = q.type?.toLowerCase().includes("bug") ? "bug" : (q.type?.toLowerCase().includes("perf") ? "perf" : "challenge");
          return `
            <div class="drill-card">
              <div class="drill-header">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="drill-badge ${badgeClass}">${q.badge || q.type || "Interview Question"}</span>
                  <strong style="color: var(--text-bright); font-size: 1rem;">Q${i + 1}: ${q.title || "Technical Scenario"}</strong>
                </div>
                <button class="btn btn-outline-green btn-reveal-drill" style="font-size: 0.78rem; padding: 4px 10px;">
                  Reveal Solution
                </button>
              </div>

              <div class="drill-scenario-text">
                ${q.scenario || q.question || ""}
              </div>

              <div class="drill-solution-drawer" style="display: none;">
                <div class="drill-formula-box">
                  <strong>Solution / Formula:</strong>
                  <pre style="margin-top: 0.4rem; white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.88rem;">${q.solution || ""}</pre>
                </div>

                ${q.pitfallToAvoid ? `
                  <div class="drill-pitfall-box">
                    <strong>⚠️ Common Pitfall that Fails the Interview:</strong>
                    <p style="margin-top: 0.25rem;">${q.pitfallToAvoid}</p>
                  </div>
                ` : ""}

                ${q.interviewTalkingPoint ? `
                  <div class="drill-talking-point-box">
                    <strong>🎙️ What to Say Aloud to the Interviewer:</strong>
                    <p style="margin-top: 0.25rem;">${q.interviewTalkingPoint}</p>
                  </div>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.querySelectorAll(".btn-reveal-drill").forEach(btn => {
      btn.addEventListener("click", () => {
        const drawer = btn.closest(".drill-card").querySelector(".drill-solution-drawer");
        if (drawer.style.display === "none") {
          drawer.style.display = "flex";
          btn.textContent = "Hide Solution";
        } else {
          drawer.style.display = "none";
          btn.textContent = "Reveal Solution";
        }
      });
    });
  } catch (err) {
    console.error("Failed to generate drill:", err);
    container.innerHTML = `
      <div style="padding: 1.5rem; background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); border-radius: var(--radius-md); color: #FECDD3;">
        <strong>Error:</strong> Failed to generate AI drill: ${err.message}
      </div>
    `;
  }
}

/**
 * Settings Modal and Persistence
 */
function loadSavedSettings() {
  const key = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();
  const { username, key: kaggleKey } = Storage.getKaggleCredentials();

  document.getElementById("input-gemini-key").value = key;
  document.getElementById("select-gemini-model").value = model || DEFAULT_MODEL;
  document.getElementById("input-kaggle-user").value = username;
  document.getElementById("input-kaggle-key").value = kaggleKey;

  const noticeBanner = document.getElementById("banner-api-notice");
  if (noticeBanner) {
    noticeBanner.style.display = key ? "none" : "flex";
  }
}

function saveSettings() {
  const geminiKey = document.getElementById("input-gemini-key").value.trim();
  const geminiModel = document.getElementById("select-gemini-model").value;
  const kaggleUser = document.getElementById("input-kaggle-user").value.trim();
  const kaggleKey = document.getElementById("input-kaggle-key").value.trim();

  Storage.setGeminiKey(geminiKey);
  Storage.setGeminiModel(geminiModel);
  Storage.setKaggleCredentials(kaggleUser, kaggleKey);

  document.getElementById("modal-settings").classList.remove("active");
  document.getElementById("banner-api-notice").style.display = geminiKey ? "none" : "flex";

  alert("Settings saved successfully!");
}

/**
 * Event Listeners Binding
 */
function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
  });

  document.getElementById("nav-brand").addEventListener("click", () => switchScreen("screen-generator"));

  // Difficulty Pills
  document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.difficulty = btn.dataset.diff;
      updateDifficultyMeta(state.difficulty);
    });
  });

  // Topic action buttons
  document.getElementById("btn-select-all-topics")?.addEventListener("click", () => {
    state.selectedTopics = EXCEL_TOPICS.map(t => t.name);
    document.querySelectorAll(".topic-chip").forEach(c => c.classList.add("selected"));
    document.getElementById("selected-topics-count").textContent = "All 12 Active";
  });

  document.getElementById("btn-clear-topics")?.addEventListener("click", () => {
    state.selectedTopics = [];
    document.querySelectorAll(".topic-chip").forEach(c => c.classList.remove("selected"));
    document.getElementById("selected-topics-count").textContent = "0 Selected (All Topics)";
  });

  // Dataset Search Button
  document.getElementById("btn-search-datasets").addEventListener("click", performDatasetSearchAndRank);
  document.getElementById("btn-refresh-datasets").addEventListener("click", performDatasetSearchAndRank);

  // Generate Test Button
  document.getElementById("btn-generate-test").addEventListener("click", handleGenerateTest);

  // Load Built-in Demo Test (instant test from screenshot)
  const loadDemoFn = () => loadTestIntoView(SAMPLE_OFFLINE_TEST, true);
  document.getElementById("btn-load-sample").addEventListener("click", loadDemoFn);
  document.getElementById("btn-quick-sample").addEventListener("click", loadDemoFn);

  // Timer controls
  document.getElementById("btn-toggle-timer").addEventListener("click", toggleTimer);

  // Print Test Sheet
  document.getElementById("btn-print-test").addEventListener("click", () => {
    if (state.currentTest) Exporter.printExcelTestSheet(state.currentTest, false);
  });

  // Print Complete Solutions
  document.getElementById("btn-print-answers").addEventListener("click", () => {
    if (state.currentTest) Exporter.printExcelTestSheet(state.currentTest, true);
  });

  // Answer Key navigation
  document.getElementById("btn-submit-test").addEventListener("click", () => switchScreen("screen-answers"));
  document.getElementById("btn-back-to-test").addEventListener("click", () => switchScreen("screen-test"));

  // Quick Drill
  document.getElementById("btn-start-drill").addEventListener("click", handleStartDrill);

  // Clear history
  document.getElementById("btn-clear-history").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your test history?")) {
      localStorage.removeItem("excelcoach_test_history");
      updateProgressDashboard();
    }
  });

  // Settings Modal open/close
  const settingsModal = document.getElementById("modal-settings");
  document.getElementById("btn-open-settings").addEventListener("click", () => {
    loadSavedSettings();
    settingsModal.classList.add("active");
  });
  document.getElementById("btn-banner-settings").addEventListener("click", () => {
    loadSavedSettings();
    settingsModal.classList.add("active");
  });
  document.getElementById("btn-close-settings").addEventListener("click", () => settingsModal.classList.remove("active"));
  document.getElementById("btn-cancel-settings").addEventListener("click", () => settingsModal.classList.remove("active"));
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
}
