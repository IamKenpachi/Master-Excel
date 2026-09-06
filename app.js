// app.js - Main Application Orchestrator, Router & Interactive Test Controller

import { EXCEL_TOPICS, DIFFICULTY_CONFIG, INDUSTRY_DOMAINS, VERBAL_DEFENSE_TOPICS } from "./prompts.js";
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
  selectedTaskNum: 1,
  isStrictMode: false,
  isSchemaOpen: false,
  drillMode: "scenario", // "scenario" | "glitch" | "skeleton" | "verbal" | "verbal_defense"
  hintTiers: {}, // { [taskNum]: 0 | 1 | 2 | 3 }
  taskProgress: {}, // { [taskNum]: { done: false, rating: 'Easy'|'Fair'|'Hard', notes: '', candidateFormula: '' } }
  isChatbotOpen: false,
  chatbotHistory: [],
  isChatbotWaiting: false,
  // Phase 5 State
  isSRSReviewMode: false,
  srsQueue: [],
  srsCurrentIdx: 0,
  gauntletTimerId: null,
  gauntletRemainingSecs: 180,
  currentVerbalDrill: null,
  timer: {
    intervalId: null,
    totalSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    isRunning: false
  }
};

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", async () => {
    await loadEnvConfig();
    initUI();
    initEventListeners();
    initChatbotUI();
    loadSavedSettings();
    renderTopicChips();
    renderIndustryDomainChips();
    renderDrillTopicSelect();
    updateProgressDashboard();
    checkDailyGauntlet();

    // If there's an active test in session, prompt or restore it
    const cachedTest = Storage.getActiveTest();
    if (cachedTest && cachedTest.test) {
      loadTestIntoView(cachedTest, false);
    }
  });
}

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

  // Drill workout mode pills
  document.querySelectorAll(".drill-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".drill-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.drillMode = btn.dataset.mode || "scenario";
      const selectMode = document.getElementById("select-drill-mode");
      if (selectMode) selectMode.value = state.drillMode;

      const verbalArea = document.getElementById("verbal-defense-area");
      const qContainer = document.getElementById("drill-questions-container");
      if (state.drillMode === "verbal_defense") {
        if (qContainer) qContainer.style.display = "none";
        if (verbalArea) {
          verbalArea.classList.remove("hidden");
          verbalArea.style.display = "block";
        }
        generateVerbalDefenseDrill();
      } else {
        if (verbalArea) {
          verbalArea.classList.add("hidden");
          verbalArea.style.display = "none";
        }
      }
    });
  });

  const selectDrillMode = document.getElementById("select-drill-mode");
  if (selectDrillMode) {
    selectDrillMode.addEventListener("change", (e) => {
      state.drillMode = e.target.value;
      document.querySelectorAll(".drill-mode-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === state.drillMode);
      });
      const verbalArea = document.getElementById("verbal-defense-area");
      const qContainer = document.getElementById("drill-questions-container");
      if (state.drillMode === "verbal_defense") {
        if (qContainer) qContainer.style.display = "none";
        if (verbalArea) {
          verbalArea.classList.remove("hidden");
          verbalArea.style.display = "block";
        }
        generateVerbalDefenseDrill();
      } else {
        if (verbalArea) {
          verbalArea.classList.add("hidden");
          verbalArea.style.display = "none";
        }
      }
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

  updateChatbotContextLabel();
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
 * Render Preset Industry Domain Topic Chips for Dataset Search
 * Allows clicking a domain to populate the search bar, with full editing freedom
 */
export function renderIndustryDomainChips() {
  const container = document.getElementById("dataset-topics-grid");
  const inputQuery = document.getElementById("input-dataset-query");
  if (!container || !inputQuery) return;

  container.innerHTML = "";

  INDUSTRY_DOMAINS.forEach(domain => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "domain-topic-chip";
    chip.dataset.topic = domain.query;
    chip.dataset.id = domain.id;
    chip.title = `Fill search bar with "${domain.query}"`;
    chip.innerHTML = `<span class="chip-icon">${domain.icon}</span><span class="chip-name">${domain.name}</span>`;

    // Check if initial input value matches this domain
    const currentVal = inputQuery.value.trim().toLowerCase();
    if (currentVal && (currentVal === domain.query.toLowerCase() || currentVal === (domain.shortName || "").toLowerCase())) {
      chip.classList.add("active");
    }

    chip.addEventListener("click", () => {
      // If clicked, replace existing text in the input bar with this topic
      inputQuery.value = domain.query;
      inputQuery.focus();

      // Update active chip styling
      document.querySelectorAll(".domain-topic-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });

    container.appendChild(chip);
  });

  // Listen for user manual typing/modification to sync active state
  inputQuery.addEventListener("input", () => {
    const typedVal = inputQuery.value.trim().toLowerCase();
    document.querySelectorAll(".domain-topic-chip").forEach(chip => {
      const topicVal = (chip.dataset.topic || "").toLowerCase();
      if (typedVal && topicVal === typedVal) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
  });

  // Pressing Enter in the search input triggers dataset search
  inputQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performDatasetSearchAndRank();
    }
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

    if (datasetMeta && !testPayload.datasetMeta) {
      testPayload.datasetMeta = datasetMeta;
    }

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
 * Live Excel Formula Linter & Interview Syntax Validator
 */
export function lintExcelFormula(formula) {
  if (!formula || !formula.trim()) {
    return { status: "idle", badge: "", message: "" };
  }

  const trimmed = formula.trim();

  // Rule 1: Formula must start with =
  if (!trimmed.startsWith("=")) {
    return {
      status: "warning",
      badge: "SYNTAX TIP",
      message: "Excel formulas must begin with '=' (e.g., =SUM(A1:A10) or =XLOOKUP(...))."
    };
  }

  // Rule 2: Check balanced double quotes first
  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return {
      status: "error",
      badge: "SYNTAX ERROR",
      message: "Unclosed text string quotation (\"). Formulas require paired quotes for text literals."
    };
  }

  // Rule 3: Check balanced square brackets for structured table references []
  const openBracket = (trimmed.match(/\[/g) || []).length;
  const closeBracket = (trimmed.match(/\]/g) || []).length;
  if (openBracket !== closeBracket) {
    return {
      status: "error",
      badge: "SYNTAX ERROR",
      message: "Unclosed structured table reference bracket '[]'. Check column references."
    };
  }

  // Rule 4: Check balanced parentheses () (ignoring text inside quotes)
  let openParen = 0;
  let inQuote = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === '(') openParen++;
      if (ch === ')') openParen--;
    }
  }
  if (openParen !== 0) {
    return {
      status: "error",
      badge: "SYNTAX ERROR",
      message: openParen > 0
        ? `Missing ${openParen} closing parenthesis ')' in formula.`
        : `Found ${Math.abs(openParen)} extra closing parenthesis ')'.`
    };
  }

  // Rule 5: XLOOKUP argument count syntax check (minimum 3 arguments)
  if (/\bXLOOKUP\s*\(/i.test(trimmed)) {
    const inner = trimmed.replace(/^.*?XLOOKUP\s*\(/i, "").replace(/\)[^)]*$/, "");
    const args = inner.split(",");
    if (args.length < 3) {
      return {
        status: "error",
        badge: "ARGUMENT COUNT",
        message: "XLOOKUP requires at least 3 arguments: =XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])."
      };
    }
  }

  // Rule 6: Volatile functions check (Crucial for senior interview benchmark)
  if (/\bOFFSET\s*\(/i.test(trimmed)) {
    return {
      status: "warning",
      badge: "PERFORMANCE PITFALL",
      message: "⚠️ OFFSET is a volatile function that recalculates on every cell change. Interviewers favor non-volatile INDEX or XLOOKUP."
    };
  }
  if (/\bINDIRECT\s*\(/i.test(trimmed)) {
    return {
      status: "warning",
      badge: "PERFORMANCE PITFALL",
      message: "⚠️ INDIRECT is a volatile function and breaks formula auditability. Favor dynamic structured table references."
    };
  }

  // Rule 7: VLOOKUP exact match check
  if (/\bVLOOKUP\s*\(/i.test(trimmed)) {
    const inner = trimmed.replace(/^.*?VLOOKUP\s*\(/i, "").replace(/\)[^)]*$/, "");
    const args = inner.split(",");
    if (args.length < 4 || (!args[3].toLowerCase().includes("false") && !args[3].trim().startsWith("0"))) {
      return {
        status: "warning",
        badge: "INTERVIEW PITFALL",
        message: "💡 Missing exact-match flag in VLOOKUP. Always pass FALSE (or 0) as 4th parameter in business analysis interviews."
      };
    }
  }

  // Rule 8: Full column references check (e.g. A:A, C:C)
  if (/\b[A-Z]{1,3}:[A-Z]{1,3}\b/i.test(trimmed)) {
    return {
      status: "warning",
      badge: "BEST PRACTICE",
      message: "💡 Entire column scan detected (like A:A). In interviews, use structured Table references (Table[Col]) or bound ranges."
    };
  }

  // Rule 9: SUMIFS argument order reminder
  if (/\bSUMIFS\s*\(/i.test(trimmed)) {
    return {
      status: "valid",
      badge: "SYNTAX VALID",
      message: "✅ SUMIFS detected. Remember: sum_range comes first, followed by criteria_range1, criteria1."
    };
  }

  return {
    status: "valid",
    badge: "SYNTAX VALID",
    message: "✅ Formula syntax is well-formed with balanced delimiters."
  };
}

/**
 * 3-Tier Progressive Hint Generator
 * Tier 1: Conceptual Nudge
 * Tier 2: Syntax Blueprint / Signature
 * Tier 3: Complete Solution & Rationale
 */
export function getTaskHintTiers(task, answerObj) {
  const instruction = task?.instruction || "";
  const directHint = task?.hint || "";
  const solAnswer = answerObj?.answer || directHint;

  // Tier 1: Concept Nudge
  let nudge = task?.hintNudge || "";
  if (!nudge) {
    if (/Power Query|Get & Transform|Ingest/i.test(instruction) || /Ingestion/i.test(task?.category)) {
      nudge = "Route external raw data through Power Query (Data > Get Data) to ensure automated, repeatable refreshes.";
    } else if (/XLOOKUP|VLOOKUP|INDEX|Lookup/i.test(instruction) || /Lookup/i.test(task?.category)) {
      nudge = "Identify the unique foreign key connecting the tables. Favor modern exact-match lookup functions.";
    } else if (/Pivot/i.test(instruction) || /Pivot/i.test(task?.category)) {
      nudge = "Insert a Pivot Table on a dedicated worksheet. Group your business dimensions in Rows and metrics in Values.";
    } else if (/SUMIFS|COUNTIFS|Aggregate/i.test(instruction)) {
      nudge = "Use multi-criteria aggregation functions. Remember structured table references expand dynamically.";
    } else if (/TRIM|CLEAN|Text/i.test(instruction)) {
      nudge = "Clean whitespace and unprintable characters first to prevent silent join or lookup failures.";
    } else {
      nudge = "Inspect the target column in the dataset schema and apply standard Excel best-practice formulas.";
    }
  }

  // Tier 2: Syntax Blueprint / Signature
  let blueprint = task?.hintBlueprint || "";
  if (!blueprint) {
    if (/XLOOKUP/i.test(directHint) || /XLOOKUP/i.test(instruction)) {
      blueprint = "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])";
    } else if (/INDEX/i.test(directHint) || /MATCH/i.test(directHint)) {
      blueprint = "=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))";
    } else if (/SUMIFS/i.test(directHint) || /SUMIFS/i.test(instruction)) {
      blueprint = "=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2])";
    } else if (/COUNTIFS/i.test(directHint)) {
      blueprint = "=COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2])";
    } else if (/IFS/i.test(directHint)) {
      blueprint = "=IFS(condition1, value1, condition2, value2, TRUE, fallback_value)";
    } else if (/TRIM/i.test(directHint)) {
      blueprint = "=TRIM(CLEAN(cell_reference))";
    } else if (/Power Query/i.test(instruction)) {
      blueprint = "Data > Get Data > From Text/CSV > Transform Data > Close & Load To...";
    } else {
      blueprint = directHint.includes("=") ? directHint : `=FUNCTION(arguments, [options])`;
    }
  }

  // Tier 3: Complete Solution & Rationale
  const solution = solAnswer || directHint || "Refer to Complete Solution Guide in the Answer Key tab.";
  const explanation = answerObj?.explanation || "Follow dynamic referencing conventions.";

  return { nudge, blueprint, solution, explanation };
}

/**
 * CSV Schema Inspector Parser
 */
export function parseDatasetSchema(csvText, datasetTitle) {
  if (!csvText || typeof csvText !== "string") {
    return { title: datasetTitle || "No Dataset", rowCount: 0, columns: [] };
  }

  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { title: datasetTitle || "Empty Dataset", rowCount: 0, columns: [] };
  }

  const parseCSVLine = (line) => {
    const result = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuote = !inQuote;
      } else if (c === ',' && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const sampleRows = lines.slice(1, 6).map(parseCSVLine);

  const columns = headers.map((header, colIdx) => {
    const samples = sampleRows.map(r => r[colIdx] || "").filter(Boolean);
    const sampleVal = samples[0] || "(empty)";

    let type = "Text";
    if (samples.length > 0) {
      if (samples.every(s => /^\$?-?\d+([.,]\d+)?%?$/.test(s.replace(/[\$,]/g, "").trim()))) {
        type = "Number / Currency";
      } else if (samples.every(s => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(s))) {
        type = "Date";
      } else if (samples.every(s => /^(true|false|yes|no)$/i.test(s))) {
        type = "Boolean";
      }
    }

    return {
      name: header.replace(/^"|"$/g, ""),
      type,
      sample: sampleVal.replace(/^"|"$/g, "")
    };
  });

  return {
    title: datasetTitle || "Active Dataset",
    rowCount: Math.max(0, lines.length - 1),
    columns
  };
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
      syntheticCsv: testPayload.syntheticCsv || testPayload.test?.syntheticCsv || "",
      datasetMeta: testPayload.datasetMeta || null,
      modelUsed: testPayload.modelUsed || "Gemini"
    };
  }

  const test = testPayload.test;
  if (!test) return;

  // Synchronize syntheticCsv between testPayload and test
  const csvContent = test.syntheticCsv || testPayload.syntheticCsv || test.datasetInfo?.syntheticCsv || "";
  test.syntheticCsv = csvContent;
  testPayload.syntheticCsv = csvContent;

  // Ensure datasetMeta is populated and retained
  if (!testPayload.datasetMeta && state.selectedDataset) {
    testPayload.datasetMeta = {
      name: state.selectedDataset.title,
      source: state.selectedDataset.source,
      url: state.selectedDataset.url,
      rowCount: state.selectedDataset.rowCount || "10,000+",
      description: state.selectedDataset.description,
      columns: state.selectedDataset.columns || []
    };
  }
  if (!testPayload.datasetMeta && test.datasetInfo) {
    testPayload.datasetMeta = {
      name: test.datasetInfo.name || test.title,
      source: test.datasetInfo.source || "Enterprise System Export",
      url: "",
      rowCount: test.datasetInfo.rowCount || "1,000+",
      description: test.datasetInfo.description || test.scenario?.background || "Curated enterprise dataset.",
      columns: test.datasetInfo.columns || []
    };
  }

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
      datasetMeta: testPayload.datasetMeta,
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

  // Automatically select first task row
  selectTaskRow(1);

  // Update Dataset Schema Inspector Drawer
  updateSchemaDrawer();
}

/**
 * Render tasks table in the screenshot-style worksheet with 3-Tier Progressive Hint Scaffold
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
    if (taskNum === (state.selectedTaskNum || 1)) row.classList.add("selected");

    const savedProg = state.taskProgress[taskNum] || { done: false, rating: "" };
    if (savedProg.done) row.classList.add("completed");

    // Retrieve 3-tier hints for this task
    const solObj = state.currentTest?.answerKey?.find(a => (a.taskNumber || a.taskNo) === taskNum);
    const hintTiers = getTaskHintTiers(task, solObj);
    const currentTier = state.hintTiers[taskNum] || 0;

    row.innerHTML = `
      <td class="task-no-cell">${taskNum}</td>
      <td class="task-instruction-cell">
        <span class="task-category-tag">${escapeHtml(task.category || "Excel")}</span>
        <strong>${escapeHtml(task.instruction || "")}</strong>
        
        <div class="hint-scaffold-container" id="hint-scaffold-${taskNum}" style="display: ${currentTier > 0 ? "flex" : "none"}; flex-direction: column;">
          <div class="hint-scaffold-topbar">
            <div class="hint-scaffold-meta">
              <span class="hint-scaffold-title">💡 Progressive Guidance</span>
              <span class="hint-tier-pill" id="hint-pill-${taskNum}">Tier ${currentTier || 1} of 3</span>
            </div>
            <div class="hint-scaffold-controls">
              <button type="button" class="btn-hint-tier-select ${currentTier === 1 ? 'active' : ''}" data-task="${taskNum}" data-tier="1" title="View Concept Nudge">💡 Nudge</button>
              <button type="button" class="btn-hint-tier-select ${currentTier === 2 ? 'active' : ''}" data-task="${taskNum}" data-tier="2" title="View Syntax Blueprint">🧩 Blueprint</button>
              <button type="button" class="btn-hint-tier-select ${currentTier === 3 ? 'active' : ''}" data-task="${taskNum}" data-tier="3" title="View Complete Solution">🔑 Solution</button>
              <button type="button" class="btn-hint-dismiss" data-task="${taskNum}" title="Close guidance">✕</button>
            </div>
          </div>

          <!-- Tier 1: Concept Nudge -->
          <div class="hint-tier-card tier-1" id="hint-tier1-${taskNum}" style="display: ${currentTier >= 1 ? "flex" : "none"};">
            <div class="hint-tier-header">
              <span class="hint-tier-badge nudge">💡 Tier 1 • Concept Nudge</span>
            </div>
            <p class="hint-tier-text">${escapeHtml(hintTiers.nudge)}</p>
            <div class="hint-tier-advance" id="hint-advance1-${taskNum}" style="display: ${currentTier === 1 ? 'block' : 'none'};">
              <button type="button" class="btn-hint-advance" data-task="${taskNum}" data-next="2">
                Need syntax structure? Reveal Tier 2 Blueprint 🧩 &rarr;
              </button>
            </div>
          </div>

          <!-- Tier 2: Syntax Blueprint -->
          <div class="hint-tier-card tier-2" id="hint-tier2-${taskNum}" style="display: ${currentTier >= 2 ? "flex" : "none"};">
            <div class="hint-tier-header">
              <span class="hint-tier-badge blueprint">🧩 Tier 2 • Syntax Blueprint</span>
              <button type="button" class="btn-copy-code" data-code="${escapeHtml(hintTiers.blueprint)}" title="Copy blueprint syntax">
                📋 Copy Syntax
              </button>
            </div>
            <pre class="hint-tier-code">${escapeHtml(hintTiers.blueprint)}</pre>
            <div class="hint-tier-advance" id="hint-advance2-${taskNum}" style="display: ${currentTier === 2 ? 'block' : 'none'};">
              <button type="button" class="btn-hint-advance" data-task="${taskNum}" data-next="3">
                Still stuck? Reveal Complete Solution 🔑 &rarr;
              </button>
            </div>
          </div>

          <!-- Tier 3: Complete Solution -->
          <div class="hint-tier-card tier-3" id="hint-tier3-${taskNum}" style="display: ${currentTier >= 3 ? "flex" : "none"};">
            <div class="hint-tier-header">
              <span class="hint-tier-badge solution">🔑 Tier 3 • Complete Solution</span>
              <button type="button" class="btn-copy-code" data-code="${escapeHtml(hintTiers.solution)}" title="Copy full solution">
                📋 Copy Formula
              </button>
            </div>
            <pre class="hint-tier-code">${escapeHtml(hintTiers.solution)}</pre>
            <div class="hint-tier-explanation">
              <strong>Interview Rationale:</strong>
              <span>${escapeHtml(hintTiers.explanation)}</span>
            </div>
          </div>
        </div>
      </td>
      <td class="task-action-cell">
        <div class="task-status-row">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem;">
            <input type="checkbox" class="task-checkbox" data-num="${taskNum}" ${savedProg.done ? "checked" : ""}>
            <span>Done</span>
          </label>
          <div class="rating-buttons">
            <button class="rating-btn easy ${savedProg.rating === "Easy" ? "active" : ""}" data-num="${taskNum}" data-val="Easy" title="Felt easy (Press 1)">Easy</button>
            <button class="rating-btn fair ${savedProg.rating === "Fair" ? "active" : ""}" data-num="${taskNum}" data-val="Fair" title="Moderate challenge (Press 2)">Fair</button>
            <button class="rating-btn hard ${savedProg.rating === "Hard" ? "active" : ""}" data-num="${taskNum}" data-val="Hard" title="Struggled / Need review (Press 3)">Hard</button>
          </div>
          <button class="btn btn-icon btn-hint-toggle" data-num="${taskNum}" title="Show / Cycle Progressive Hints (Press H)" style="min-width:32px; height:28px; font-size:0.75rem; padding: 0 6px;">
            ${currentTier === 0 ? "💡" : (currentTier === 1 ? "💡 Nudge" : (currentTier === 2 ? "🧩 Blueprint" : "🔑 Solution"))}
          </button>
        </div>
      </td>
    `;

    // Row click selects task row and connects to formula bar
    row.addEventListener("click", () => {
      selectTaskRow(taskNum);
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

    // Progressive Hint toggle button on table row
    const hintBtn = row.querySelector(".btn-hint-toggle");
    hintBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.isStrictMode) {
        alert("🛡️ Strict Exam Mode is ACTIVE!\nProgressive hints are locked to simulate authentic interview conditions.");
        return;
      }
      const cur = state.hintTiers[taskNum] || 0;
      const next = (cur + 1) % 4;
      state.hintTiers[taskNum] = next;
      updateHintScaffoldDisplay(taskNum, next, hintBtn);
    });

    // Hint scaffold topbar tier tab buttons
    row.querySelectorAll(".btn-hint-tier-select").forEach(tabBtn => {
      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.isStrictMode) return;
        const targetTier = parseInt(tabBtn.dataset.tier, 10);
        state.hintTiers[taskNum] = targetTier;
        updateHintScaffoldDisplay(taskNum, targetTier, hintBtn);
      });
    });

    // Hint scaffold dismiss button
    row.querySelector(".btn-hint-dismiss")?.addEventListener("click", (e) => {
      e.stopPropagation();
      state.hintTiers[taskNum] = 0;
      updateHintScaffoldDisplay(taskNum, 0, hintBtn);
    });

    // Hint scaffold advance buttons inside cards
    row.querySelectorAll(".btn-hint-advance").forEach(advBtn => {
      advBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.isStrictMode) return;
        const nextTier = parseInt(advBtn.dataset.next, 10);
        state.hintTiers[taskNum] = nextTier;
        updateHintScaffoldDisplay(taskNum, nextTier, hintBtn);
      });
    });

    // Copy Code / Syntax buttons
    row.querySelectorAll(".btn-copy-code").forEach(copyBtn => {
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const codeText = copyBtn.dataset.code || "";
        if (codeText && navigator.clipboard) {
          navigator.clipboard.writeText(codeText).then(() => {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1400);
          }).catch(() => {
            // Fallback copy
            const textarea = document.createElement("textarea");
            textarea.value = codeText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1400);
          });
        }
      });
    });

    tbody.appendChild(row);
  });
}

/**
 * Update 3-Tier Hint Scaffold visibility and button state
 */
function updateHintScaffoldDisplay(taskNum, tier, btnElement) {
  const scaffold = document.getElementById(`hint-scaffold-${taskNum}`);
  const t1 = document.getElementById(`hint-tier1-${taskNum}`);
  const t2 = document.getElementById(`hint-tier2-${taskNum}`);
  const t3 = document.getElementById(`hint-tier3-${taskNum}`);
  const pill = document.getElementById(`hint-pill-${taskNum}`);
  const adv1 = document.getElementById(`hint-advance1-${taskNum}`);
  const adv2 = document.getElementById(`hint-advance2-${taskNum}`);
  const btn = btnElement || document.querySelector(`.btn-hint-toggle[data-num="${taskNum}"]`);

  if (!scaffold || !t1 || !t2 || !t3) return;

  if (tier === 0) {
    scaffold.style.display = "none";
    t1.style.display = "none";
    t2.style.display = "none";
    t3.style.display = "none";
    if (btn) {
      btn.innerHTML = "💡";
      btn.title = "Show / Cycle Progressive Hints (Press H)";
    }
  } else {
    scaffold.style.display = "flex";
    scaffold.style.flexDirection = "column";
    t1.style.display = tier >= 1 ? "flex" : "none";
    t2.style.display = tier >= 2 ? "flex" : "none";
    t3.style.display = tier >= 3 ? "flex" : "none";

    if (pill) pill.textContent = `Tier ${tier} of 3`;
    if (adv1) adv1.style.display = tier === 1 ? "block" : "none";
    if (adv2) adv2.style.display = tier === 2 ? "block" : "none";

    // Update active state of topbar buttons
    scaffold.querySelectorAll(".btn-hint-tier-select").forEach(b => {
      const bTier = parseInt(b.dataset.tier, 10);
      b.classList.toggle("active", bTier === tier);
    });

    if (btn) {
      if (tier === 1) {
        btn.innerHTML = "💡 Nudge";
        btn.title = "Tier 1 visible. Click for Syntax Blueprint (Tier 2)";
      } else if (tier === 2) {
        btn.innerHTML = "🧩 Blueprint";
        btn.title = "Tier 2 visible. Click for Complete Solution (Tier 3)";
      } else if (tier === 3) {
        btn.innerHTML = "🔑 Solution";
        btn.title = "Tier 3 visible. Click to hide hints";
      }
    }
  }
}

/**
 * Focus and select a specific task row in the simulated spreadsheet
 */
function selectTaskRow(taskNum) {
  state.selectedTaskNum = taskNum;
  document.querySelectorAll(".task-row").forEach(r => r.classList.remove("selected"));
  const row = document.getElementById(`task-row-${taskNum}`);
  if (row) {
    row.classList.add("selected");
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Update formula bar mock cell name
  const cellNameEl = document.getElementById("formula-cell-name");
  if (cellNameEl) cellNameEl.textContent = `B${taskNum + 6}`;

  // Update formula bar input with candidate formula or clear
  const formulaInput = document.getElementById("formula-bar-input");
  if (formulaInput) {
    const candidateFormula = state.taskProgress[taskNum]?.candidateFormula || "";
    formulaInput.value = candidateFormula;
    if (candidateFormula) {
      runFormulaLinter();
    } else {
      const linterBox = document.getElementById("formula-linter-feedback");
      if (linterBox) linterBox.style.display = "none";
    }
  }

  updateChatbotContextLabel();
}

/**
 * Execute live formula linting against active formula bar input
 */
function runFormulaLinter() {
  const formulaInput = document.getElementById("formula-bar-input");
  const linterBox = document.getElementById("formula-linter-feedback");
  if (!formulaInput || !linterBox) return;

  const formula = formulaInput.value.trim();
  if (!formula) {
    linterBox.style.display = "none";
    return;
  }

  // Save candidate draft formula to current task progress
  if (state.selectedTaskNum) {
    saveTaskState(state.selectedTaskNum, { candidateFormula: formula });
  }

  const result = lintExcelFormula(formula);
  linterBox.style.display = "flex";
  linterBox.className = `formula-linter-box ${result.status}`;
  linterBox.innerHTML = `
    <span class="linter-badge ${result.status}">${escapeHtml(result.badge)}</span>
    <span class="linter-message">${escapeHtml(result.message)}</span>
  `;
}

/**
 * Update Dataset Schema Inspector drawer contents with active test dataset
 */
function updateSchemaDrawer() {
  const titleEl = document.getElementById("schema-dataset-title");
  const colCountEl = document.getElementById("schema-col-count");
  const rowCountEl = document.getElementById("schema-row-count");
  const tbodyEl = document.getElementById("schema-table-tbody");
  if (!tbodyEl) return;

  const currentTest = state.currentTest || Storage.getActiveTest();
  const testObj = currentTest?.test || currentTest || {};
  const datasetMeta = currentTest?.datasetMeta || state.selectedDataset || testObj?.datasetInfo || {};

  // Extract raw CSV content
  const csvContent = currentTest?.syntheticCsv || testObj?.syntheticCsv || testObj?.datasetInfo?.syntheticCsv || "";
  const testTitle = datasetMeta.name || datasetMeta.title || testObj.title || "Active Test Dataset";

  let schema = parseDatasetSchema(csvContent, testTitle);

  // Fallback 1: If CSV was empty/unparsed, extract columns from datasetMeta or testObj.datasetInfo
  if (schema.columns.length === 0 && Array.isArray(datasetMeta.columns) && datasetMeta.columns.length > 0) {
    schema = {
      title: testTitle,
      rowCount: datasetMeta.rowCount || "1,000+",
      columns: datasetMeta.columns.map(c => {
        if (typeof c === "string") return { name: c, type: "Text", sample: "—" };
        return {
          name: c.name || c.column || String(c),
          type: c.type || "Text",
          sample: c.sample || "—"
        };
      })
    };
  }

  // Fallback 2: Extract column references from test tasks if CSV is missing
  if (schema.columns.length === 0 && Array.isArray(testObj.tasks) && testObj.tasks.length > 0) {
    const extractedCols = new Set();
    testObj.tasks.forEach(t => {
      const instr = t.instruction || "";
      const matches = instr.match(/\[([A-Za-z0-9_\s]+)\]/g);
      if (matches) {
        matches.forEach(m => {
          const colName = m.replace(/[\[\]]/g, "").trim();
          if (colName && !colName.startsWith("tbl") && colName.length < 30) {
            extractedCols.add(colName);
          }
        });
      }
    });
    if (extractedCols.size > 0) {
      schema = {
        title: testTitle,
        rowCount: "Sample Table",
        columns: Array.from(extractedCols).map(c => ({
          name: c,
          type: /date|year|month/i.test(c) ? "Date" : (/amount|price|cost|revenue|units|sales|revpar|rate|id|code/i.test(c) ? "Number / Currency" : "Text"),
          sample: "—"
        }))
      };
    }
  }

  // Update Drawer Headers
  if (titleEl) {
    titleEl.textContent = `${schema.title} (${schema.rowCount} rows)`;
  }
  if (colCountEl) {
    colCountEl.textContent = `${schema.columns.length} Columns`;
  }
  if (rowCountEl) {
    rowCountEl.textContent = `${schema.rowCount} Sample Rows`;
  }

  // Render Table Rows
  if (schema.columns.length === 0) {
    tbodyEl.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">
          No column definitions or raw CSV attached to this test.<br>
          <span style="font-size:0.78rem; opacity:0.8;">Click <strong>Dataset Details</strong> on top to review the case study description.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbodyEl.innerHTML = schema.columns.map(col => {
    const typeStr = (col.type || "Text").toLowerCase();
    const typeClass = typeStr.includes("number") || typeStr.includes("float") || typeStr.includes("int")
      ? "number"
      : (typeStr.includes("date") ? "date" : "text");

    return `
      <tr class="schema-col-row" data-col="${escapeHtml(col.name)}" title="Click to copy @[${escapeHtml(col.name)}]">
        <td><strong style="color:var(--text-bright);">${escapeHtml(col.name)}</strong></td>
        <td><span class="schema-type-pill ${typeClass}">${escapeHtml(col.type)}</span></td>
        <td><code style="font-size:0.75rem; color:var(--accent-green);">${escapeHtml(String(col.sample || "—"))}</code></td>
      </tr>
    `;
  }).join("");

  // Attach click-to-copy handler
  tbodyEl.querySelectorAll(".schema-col-row").forEach(row => {
    row.addEventListener("click", () => {
      const colName = row.dataset.col;
      const ref = `@[${colName}]`;
      navigator.clipboard?.writeText(ref).then(() => {
        const strong = row.querySelector("strong");
        if (strong) {
          const orig = strong.textContent;
          strong.textContent = `✓ Copied ${ref}!`;
          setTimeout(() => { strong.textContent = orig; }, 1200);
        }
      });
    });
  });
}

/**
 * Render and Open Dataset Details Modal
 */
function openDatasetDetailsModal() {
  const modal = document.getElementById("modal-dataset-details");
  if (!modal) return;
  renderDatasetDetailsModal();
  modal.classList.add("active");
}

/**
 * Close Dataset Details Modal
 */
function closeDatasetDetailsModal() {
  const modal = document.getElementById("modal-dataset-details");
  if (!modal) return;
  modal.classList.remove("active");
}

/**
 * Render dynamic dataset description and variables dictionary inside modal
 */
function renderDatasetDetailsModal() {
  const titleEl = document.getElementById("dataset-modal-title");
  const badgesEl = document.getElementById("dataset-modal-badges");
  const bodyEl = document.getElementById("dataset-modal-body");
  if (!bodyEl) return;

  const currentTest = state.currentTest || Storage.getActiveTest();
  const testObj = currentTest?.test || currentTest || {};
  const datasetMeta = currentTest?.datasetMeta || state.selectedDataset || testObj?.datasetInfo || {};
  const scenario = testObj?.scenario || {};

  const title = datasetMeta.name || datasetMeta.title || testObj.title || "Dataset Documentation";
  const source = datasetMeta.source || state.selectedDataset?.source || testObj?.datasetInfo?.source || "Curated Practice Data";
  const rowCount = datasetMeta.rowCount || testObj?.datasetInfo?.rowCount || "1,000+ records";
  const url = datasetMeta.url || state.selectedDataset?.url || "";
  const rawDescription = datasetMeta.description || state.selectedDataset?.description || testObj?.datasetInfo?.description || scenario.background || "Comprehensive business dataset curated for Excel candidate assessment.";

  // Extract CSV and parse schema
  const csvContent = currentTest?.syntheticCsv || testObj?.syntheticCsv || testObj?.datasetInfo?.syntheticCsv || "";
  const schema = parseDatasetSchema(csvContent, title);
  let columns = schema.columns;

  if (columns.length === 0 && Array.isArray(datasetMeta.columns) && datasetMeta.columns.length > 0) {
    columns = datasetMeta.columns.map(c => {
      if (typeof c === "string") return { name: c, type: "Text", sample: "—" };
      return { name: c.name || c.column || String(c), type: c.type || "Text", sample: c.sample || "—" };
    });
  }

  // Update Title & Badges
  if (titleEl) titleEl.textContent = title;
  if (badgesEl) {
    badgesEl.innerHTML = `
      <span class="dataset-meta-badge">📁 Source: <strong>${escapeHtml(source)}</strong></span>
      <span class="dataset-meta-badge">📊 <strong>${escapeHtml(String(rowCount))}</strong></span>
      <span class="dataset-meta-badge">🏷️ <strong>${columns.length} Variables</strong></span>
      ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="dataset-source-link" style="margin-left:auto;">↗ Open on ${escapeHtml(source)}</a>` : ""}
    `;
  }

  // Build Variables Table HTML
  let varsTableHtml = "";
  if (columns.length > 0) {
    varsTableHtml = `
      <div class="dataset-section-block">
        <div class="dataset-section-title">
          <span>📋</span> Variables & Schema Dictionary (${columns.length} Columns)
        </div>
        <div style="max-height: 280px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm);">
          <table class="dataset-vars-table">
            <thead>
              <tr>
                <th>Column / Variable</th>
                <th>Inferred Type</th>
                <th>Sample / Format</th>
                <th style="text-align:right;">Structured Ref</th>
              </tr>
            </thead>
            <tbody>
              ${columns.map(col => {
                const typeStr = (col.type || "Text").toLowerCase();
                const typeClass = typeStr.includes("number") || typeStr.includes("float") || typeStr.includes("int")
                  ? "number"
                  : (typeStr.includes("date") ? "date" : "text");
                return `
                  <tr>
                    <td><strong style="color:var(--text-bright);">${escapeHtml(col.name)}</strong></td>
                    <td><span class="schema-type-pill ${typeClass}">${escapeHtml(col.type)}</span></td>
                    <td><code style="font-size:0.75rem; color:var(--accent-green);">${escapeHtml(String(col.sample || "—"))}</code></td>
                    <td style="text-align:right;">
                      <button class="btn btn-secondary btn-copy-col-ref" data-ref="@[${escapeHtml(col.name)}]" style="padding: 2px 7px; font-size: 0.72rem;">
                        Copy @[${escapeHtml(col.name)}]
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; margin-bottom: 0;">
          💡 Tip: Click any structured reference button to copy <code>@[Column]</code> directly into your formula.
        </p>
      </div>
    `;
  }

  // Format Description with paragraphs
  const formattedDesc = escapeHtml(rawDescription)
    .replace(/\r?\n\r?\n/g, "</p><p style='margin-top:0.6rem;'>")
    .replace(/\r?\n/g, "<br>");

  bodyEl.innerHTML = `
    <!-- Dataset Summary -->
    <div class="dataset-section-block">
      <div class="dataset-section-title">
        <span>📄</span> Dataset Overview & Description
      </div>
      <div class="dataset-desc-content">
        <p style="margin: 0;">${formattedDesc}</p>
      </div>
    </div>

    <!-- Variables & Column Dictionary -->
    ${varsTableHtml}

    <!-- Business Context & Scenario -->
    ${scenario.background || scenario.objective ? `
      <div class="dataset-section-block">
        <div class="dataset-section-title">
          <span>💼</span> Business Scenario & Objectives
        </div>
        ${scenario.company ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.4rem;">Organization: <strong style="color:var(--text-bright);">${escapeHtml(scenario.company)}</strong> ${scenario.industry ? `(${escapeHtml(scenario.industry)})` : ""}</div>` : ""}
        ${scenario.background ? `<p style="font-size:0.84rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.5rem;">${escapeHtml(scenario.background)}</p>` : ""}
        ${scenario.objective ? `<div style="font-size:0.84rem; color:var(--accent-cyan); background:rgba(6,182,212,0.06); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); border-left:3px solid var(--accent-cyan);"><strong>Objective:</strong> ${escapeHtml(scenario.objective)}</div>` : ""}
      </div>
    ` : ""}

    <!-- Data Hygiene & Interview Notes -->
    ${testObj?.datasetInfo?.dataHygieneNotes ? `
      <div class="dataset-section-block" style="border-left: 3px solid var(--accent-amber);">
        <div class="dataset-section-title" style="color: var(--accent-amber);">
          <span>⚠️</span> Data Hygiene & Preprocessing Notes
        </div>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
          ${escapeHtml(testObj.datasetInfo.dataHygieneNotes)}
        </p>
      </div>
    ` : ""}
  `;

  // Attach click-to-copy handlers on the modal buttons
  bodyEl.querySelectorAll(".btn-copy-col-ref").forEach(btn => {
    btn.addEventListener("click", () => {
      const ref = btn.dataset.ref;
      navigator.clipboard?.writeText(ref).then(() => {
        const orig = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => { btn.textContent = orig; }, 1200);
      });
    });
  });
}

/**
 * Toggle Dataset Schema Inspector Drawer
 */
function toggleSchemaDrawer(force) {
  const drawer = document.getElementById("schema-inspector-drawer");
  if (!drawer) return;
  const shouldOpen = force !== undefined ? force : !state.isSchemaOpen;
  state.isSchemaOpen = shouldOpen;
  drawer.classList.toggle("open", shouldOpen);
  drawer.setAttribute("aria-hidden", String(!shouldOpen));
  if (shouldOpen) {
    updateSchemaDrawer();
  }
}

/**
 * Toggle Strict Exam Mode
 */
function toggleStrictMode() {
  state.isStrictMode = !state.isStrictMode;
  const btn = document.getElementById("btn-toggle-strict");
  const icon = document.getElementById("strict-mode-icon");
  const text = document.getElementById("strict-mode-text");
  if (btn && icon && text) {
    if (state.isStrictMode) {
      btn.classList.add("active");
      icon.textContent = "⚡";
      text.textContent = "Strict Mode: ON";
      // Hide all active hints and lock buttons
      document.querySelectorAll(".hint-scaffold-container").forEach(c => c.style.display = "none");
      document.querySelectorAll(".btn-hint-toggle").forEach(b => {
        b.innerHTML = "🔒";
        b.title = "Hints locked in Strict Exam Mode";
      });
      alert("🛡️ Strict Exam Mode ACTIVATED!\n• Progressive hints locked.\n• Time-pressured exam simulation enabled.\n• Solve candidate tasks without assistance.");
    } else {
      btn.classList.remove("active");
      icon.textContent = "🛡️";
      text.textContent = "Strict Mode: OFF";
      document.querySelectorAll(".btn-hint-toggle").forEach(b => {
        const num = parseInt(b.dataset.num, 10);
        const curTier = state.hintTiers[num] || 0;
        b.innerHTML = curTier === 0 ? "💡" : (curTier === 1 ? "💡 Nudge" : (curTier === 2 ? "🧩 Blueprint" : "🔑 Solution"));
        b.title = "Show / Cycle Progressive Hints (Press H)";
      });
    }
  }
  updateTimerDisplay();
}

function saveTaskState(taskNum, partial) {
  state.taskProgress[taskNum] = {
    ...(state.taskProgress[taskNum] || {}),
    ...partial
  };
  if (partial.rating) {
    const task = state.currentTest?.test?.tasks?.find(t => (t.number || t.id) === taskNum) || { number: taskNum, instruction: "", category: partial.category || "General" };
    if (partial.rating === "Hard" || (state.hintTiers[taskNum] || 0) >= 3) {
      Storage.addToSRSQueue(task, partial.rating, state.currentTest?.test?.id || "test");
      Storage.logActivity(null, { hardTasksRated: 1 });
    }
    Storage.logActivity(null, { tasksCompleted: 1 });
  }
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

  if (state.isStrictMode) {
    display.classList.add("strict-pulse");
  } else {
    display.classList.remove("strict-pulse");
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
  const warmupTopicEl = document.getElementById("warmup-topic-name");
  if (warmupTopicEl) warmupTopicEl.textContent = weakRec;

  // Phase 5: Spaced Repetition (SRS) stats
  const srsStats = Storage.getSRSStats();
  const dueCountEl = document.getElementById("srs-due-count");
  const totalCountEl = document.getElementById("srs-total-count");
  const masteredCountEl = document.getElementById("srs-mastered-count");
  const srsSubtitleEl = document.getElementById("srs-subtitle");
  const btnStartSRSEl = document.getElementById("btn-start-srs");

  if (dueCountEl) dueCountEl.textContent = srsStats.dueToday;
  if (totalCountEl) totalCountEl.textContent = srsStats.totalQueued;
  if (masteredCountEl) masteredCountEl.textContent = srsStats.masteredCount;
  if (srsSubtitleEl) {
    srsSubtitleEl.textContent = srsStats.dueToday > 0
      ? `📚 ${srsStats.dueToday} task${srsStats.dueToday === 1 ? '' : 's'} scheduled for re-review today`
      : `All caught up! ${srsStats.totalQueued} items in long-term memory queue`;
  }
  if (btnStartSRSEl) {
    btnStartSRSEl.disabled = (srsStats.dueToday === 0);
  }

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
 * Calculate Hiring Manager Technical Readiness Evaluation
 */
export function calculateHiringManagerScore(testData, taskProgress = {}, hintTiers = {}, isStrictMode = false) {
  const test = testData?.test || testData;
  const tasks = test?.tasks || [];
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return {
      score: 0,
      verdict: "NEEDS WORK",
      verdictTitle: "Focus on Core Competencies & Foundations",
      badgeClass: "badge-rose",
      categoryScores: {}
    };
  }

  let totalEarned = 0;
  const categoryStats = {};

  tasks.forEach((t, idx) => {
    const num = parseInt(t.number || t.no || (idx + 1), 10);
    const cat = t.category || "Excel Core";
    if (!categoryStats[cat]) categoryStats[cat] = { earned: 0, total: 0 };
    categoryStats[cat].total += 100;

    const prog = taskProgress[num];
    if (prog && prog.done) {
      let taskBase = 80;
      if (prog.rating === "Easy") taskBase = 100;
      else if (prog.rating === "Fair") taskBase = 75;
      else if (prog.rating === "Hard") taskBase = 40;

      // Assistance penalty
      const tierUsed = hintTiers[num] || 0;
      let penalty = 0;
      if (tierUsed === 1) penalty = 5;
      else if (tierUsed === 2) penalty = 15;
      else if (tierUsed === 3) penalty = 30;

      const finalTaskScore = Math.max(10, taskBase - penalty);
      totalEarned += finalTaskScore;
      categoryStats[cat].earned += finalTaskScore;
    }
  });

  let rawPct = Math.round(totalEarned / totalTasks);
  if (isStrictMode && rawPct > 0) {
    rawPct = Math.min(100, rawPct + 10); // Strict mode bonus
  }

  const categoryScores = {};
  Object.entries(categoryStats).forEach(([cat, data]) => {
    categoryScores[cat] = Math.round((data.earned / data.total) * 100);
  });

  let verdict = "NEEDS WORK";
  let verdictTitle = "Focus on Core Competencies & Foundations";
  let badgeClass = "badge-rose";
  if (rawPct >= 85) {
    verdict = "STRONG HIRE";
    verdictTitle = "Ready for Senior Data Analyst Technical Screen";
    badgeClass = "badge-emerald";
  } else if (rawPct >= 70) {
    verdict = "HIRE";
    verdictTitle = "Solid Analytical Execution & Formula Fluency";
    badgeClass = "badge-emerald";
  } else if (rawPct >= 55) {
    verdict = "BORDERLINE";
    verdictTitle = "Targeted Review Recommended on Weak Areas";
    badgeClass = "badge-amber";
  }

  return {
    score: rawPct,
    verdict,
    verdictTitle,
    badgeClass,
    categoryScores
  };
}

/**
 * Open the Hiring Manager Scorecard Modal
 */
function openHiringManagerScorecard() {
  if (!state.currentTest) return;
  const evaluation = calculateHiringManagerScore(state.currentTest, state.taskProgress, state.hintTiers, state.isStrictMode);

  const modal = document.getElementById("modal-scorecard");
  if (!modal) return;

  const scoreCircle = document.getElementById("scorecard-circle-score");
  const verdictBadge = document.getElementById("scorecard-verdict-badge");
  const verdictTitle = document.getElementById("scorecard-verdict-title");
  const tasksStat = document.getElementById("scorecard-stat-tasks");
  const confStat = document.getElementById("scorecard-stat-confidence");
  const hintsStat = document.getElementById("scorecard-stat-hints");
  const strictStat = document.getElementById("scorecard-stat-strict");
  const adviceText = document.getElementById("scorecard-advice-text");
  const compList = document.getElementById("scorecard-competency-list");

  if (scoreCircle) scoreCircle.textContent = `${evaluation.score}%`;
  if (verdictBadge) {
    verdictBadge.textContent = evaluation.verdict;
  }
  if (verdictTitle) verdictTitle.textContent = evaluation.verdictTitle;

  const totalTasks = state.currentTest?.test?.tasks?.length || 0;
  const completedCount = Object.values(state.taskProgress).filter(p => p.done).length;
  if (tasksStat) tasksStat.textContent = `${completedCount} / ${totalTasks}`;

  const ratedCount = Object.values(state.taskProgress).filter(p => p.rating === "Easy" || p.rating === "Fair").length;
  const confPct = completedCount > 0 ? Math.round((ratedCount / completedCount) * 100) : 0;
  if (confStat) confStat.textContent = `${confPct}% Confident`;

  const hintsUsed = Object.values(state.hintTiers).filter(t => t > 0).length;
  if (hintsStat) hintsStat.textContent = hintsUsed === 0 ? "0 (Clean • 0% Penalty)" : `${hintsUsed} Tasks Assisted`;

  if (strictStat) strictStat.textContent = state.isStrictMode ? "⚡ Strict (+10% Bonus)" : "Standard";

  if (compList) {
    compList.innerHTML = Object.entries(evaluation.categoryScores).map(([cat, score]) => `
      <div class="scorecard-comp-row">
        <div class="scorecard-comp-header">
          <span style="color:var(--text-bright); font-weight:600;">${escapeHtml(cat)}</span>
          <span style="color:${score >= 75 ? "var(--excel-green)" : (score >= 50 ? "var(--accent-amber)" : "var(--accent-rose)")}; font-weight:700; font-family:var(--font-mono);">${score}%</span>
        </div>
        <div class="scorecard-comp-bar">
          <div class="scorecard-comp-fill" style="width:${score}%; background:${score >= 75 ? "var(--excel-green)" : (score >= 50 ? "var(--accent-amber)" : "var(--accent-rose)")};"></div>
        </div>
      </div>
    `).join("");
  }

  if (adviceText) {
    const weakCats = Object.entries(evaluation.categoryScores).filter(([_, s]) => s < 70).map(([c]) => c);
    if (weakCats.length === 0) {
      adviceText.textContent = "Outstanding execution across all assessed topics! To maximize your hiring edge, focus on articulating oral trade-offs (e.g. why XLOOKUP avoids static column shift hazards) during live behavioral discussions.";
    } else {
      adviceText.textContent = `Recommended focus area: ${weakCats.join(", ")}. Use the 1-Page Cheat Sheet and Quick Drill modes to master exact syntax before interviewing with technical hiring managers.`;
    }
  }

  modal.classList.add("active");
}

/**
 * Handle Quick Drill Mode
 */
async function handleStartDrill() {
  if (state.drillMode === "verbal_defense") {
    await generateVerbalDefenseDrill();
    return;
  }
  const topicName = document.getElementById("select-drill-topic").value;
  const topic = EXCEL_TOPICS.find(t => t.name === topicName) || EXCEL_TOPICS[0];
  const container = document.getElementById("drill-questions-container");
  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();
  const drillMode = state.drillMode || "scenario";
  const modeTitle = drillMode === "glitch"
    ? "Glitch & Debug Hunt"
    : (drillMode === "skeleton" ? "Syntax Skeleton Workout" : (drillMode === "verbal" ? "Verbal Defense Roleplay" : "Technical Scenario Drill"));

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
      <p style="color: var(--text-primary); font-weight: 600;">Gemini is crafting 5 ${modeTitle} questions for ${topic.name}...</p>
      <p style="color: var(--text-muted); font-size: 0.85rem;">Designing interview-grade evaluation scenarios directly tailored to your selected workout split.</p>
    </div>
  `;

  try {
    const questions = await Gemini.generateDrillQuestions({
      topic: topic.name,
      datasetMeta: activeDataset,
      difficulty: state.difficulty,
      apiKey,
      model,
      count: 5,
      drillMode
    });

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700;">
          🎯 ${topic.name} — ${modeTitle}
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

  // Print 1-Page Interview Defense Cheat Sheet
  const printCheatSheetFn = () => {
    if (state.currentTest) Exporter.printInterviewCheatSheet(state.currentTest);
    else alert("Please load or generate a mock test first to print its cheat sheet.");
  };
  document.getElementById("btn-print-cheatsheet")?.addEventListener("click", printCheatSheetFn);
  document.getElementById("btn-scorecard-cheat-sheet")?.addEventListener("click", printCheatSheetFn);

  // Submit test -> Open Hiring Manager Readiness Scorecard
  document.getElementById("btn-submit-test").addEventListener("click", () => {
    if (state.currentTest) {
      openHiringManagerScorecard();
    } else {
      switchScreen("screen-answers");
    }
  });

  // Scorecard modal actions
  const scorecardModal = document.getElementById("modal-scorecard");
  document.getElementById("btn-close-scorecard")?.addEventListener("click", () => {
    scorecardModal?.classList.remove("active");
  });
  document.getElementById("btn-scorecard-finish")?.addEventListener("click", () => {
    scorecardModal?.classList.remove("active");
  });
  document.getElementById("btn-scorecard-view-solutions")?.addEventListener("click", () => {
    scorecardModal?.classList.remove("active");
    switchScreen("screen-answers");
  });

  // Return to test button from Answer Key
  document.getElementById("btn-back-to-test").addEventListener("click", () => switchScreen("screen-test"));

  // Quick Drill start
  document.getElementById("btn-start-drill").addEventListener("click", handleStartDrill);

  // Morning Weakness Warmup Rapid Drill
  document.getElementById("btn-start-warmup-drill")?.addEventListener("click", () => {
    const weakTopic = document.getElementById("warmup-topic-name")?.textContent || "Lookups & Reference";
    const select = document.getElementById("select-drill-topic");
    if (select) {
      const match = Array.from(select.options).find(o => o.value.toLowerCase().includes(weakTopic.toLowerCase()) || weakTopic.toLowerCase().includes(o.value.toLowerCase()));
      if (match) select.value = match.value;
    }
    switchScreen("screen-drills");
    handleStartDrill();
  });

  // Clear history
  document.getElementById("btn-clear-history").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your test history?")) {
      localStorage.removeItem("excelcoach_test_history");
      updateProgressDashboard();
    }
  });

  // Phase 5: Spaced Repetition (SRS) Review
  document.getElementById("btn-start-srs")?.addEventListener("click", startSRSReview);
  document.querySelectorAll(".btn-srs-rate").forEach(btn => {
    btn.addEventListener("click", () => {
      handleSRSRating(btn.dataset.rating);
    });
  });

  // Phase 5: Verbal Defense Submit
  document.getElementById("btn-submit-defense")?.addEventListener("click", submitVerbalDefense);

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

  // Formula Bar live linting & input
  const formulaInput = document.getElementById("formula-bar-input");
  if (formulaInput) {
    formulaInput.addEventListener("input", () => {
      runFormulaLinter();
    });
    formulaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runFormulaLinter();
      }
    });
  }
  document.getElementById("btn-check-formula")?.addEventListener("click", () => {
    runFormulaLinter();
  });

  // Schema Inspector Drawer
  document.getElementById("btn-toggle-schema")?.addEventListener("click", () => toggleSchemaDrawer());
  document.getElementById("btn-close-schema")?.addEventListener("click", () => toggleSchemaDrawer(false));

  // Dataset Details Modal
  document.getElementById("btn-toggle-dataset-info")?.addEventListener("click", openDatasetDetailsModal);
  document.getElementById("btn-close-dataset-modal")?.addEventListener("click", closeDatasetDetailsModal);
  const datasetModal = document.getElementById("modal-dataset-details");
  datasetModal?.addEventListener("click", (e) => {
    if (e.target === datasetModal) closeDatasetDetailsModal();
  });

  // Strict Exam Mode Toggle
  document.getElementById("btn-toggle-strict")?.addEventListener("click", toggleStrictMode);

  // Shortcuts Help Modal
  const shortcutsModal = document.getElementById("modal-shortcuts");
  document.getElementById("btn-shortcuts-help")?.addEventListener("click", () => {
    shortcutsModal?.classList.add("active");
  });
  document.getElementById("btn-close-shortcuts")?.addEventListener("click", () => {
    shortcutsModal?.classList.remove("active");
  });
  shortcutsModal?.addEventListener("click", (e) => {
    if (e.target === shortcutsModal) shortcutsModal.classList.remove("active");
  });

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    // Alt + C toggles AI Chatbot anywhere
    if (e.altKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      toggleChatbot();
      return;
    }

    if (e.key === "Escape") {
      document.getElementById("modal-shortcuts")?.classList.remove("active");
      document.getElementById("modal-settings")?.classList.remove("active");
      document.getElementById("modal-scorecard")?.classList.remove("active");
      closeDatasetDetailsModal();
      toggleSchemaDrawer(false);
      toggleChatbot(false);
      return;
    }

    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

    if (isTyping) {
      if (activeEl.id === "formula-bar-input" && e.key === "Escape") {
        activeEl.blur();
      }
      return;
    }

    // Only active on active test screen
    if (state.activeScreen !== "screen-test") return;

    const totalTasks = state.currentTest?.test?.tasks?.length || 0;
    if (totalTasks === 0) return;

    if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(totalTasks, (state.selectedTaskNum || 1) + 1);
      selectTaskRow(next);
    } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(1, (state.selectedTaskNum || 1) - 1);
      selectTaskRow(prev);
    } else if (e.key === " ") {
      e.preventDefault();
      const cur = state.selectedTaskNum || 1;
      const chk = document.querySelector(`.task-checkbox[data-num="${cur}"]`);
      if (chk) {
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event("change"));
      }
    } else if (e.key === "h" || e.key === "H") {
      e.preventDefault();
      const cur = state.selectedTaskNum || 1;
      const btn = document.querySelector(`.btn-hint-toggle[data-num="${cur}"]`);
      if (btn) btn.click();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      document.getElementById("formula-bar-input")?.focus();
    } else if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      toggleSchemaDrawer();
    } else if (e.key === "1") {
      e.preventDefault();
      const cur = state.selectedTaskNum || 1;
      document.querySelector(`.rating-btn.easy[data-num="${cur}"]`)?.click();
    } else if (e.key === "2") {
      e.preventDefault();
      const cur = state.selectedTaskNum || 1;
      document.querySelector(`.rating-btn.fair[data-num="${cur}"]`)?.click();
    } else if (e.key === "3") {
      e.preventDefault();
      const cur = state.selectedTaskNum || 1;
      document.querySelector(`.rating-btn.hard[data-num="${cur}"]`)?.click();
    } else if (e.key === "?") {
      e.preventDefault();
      shortcutsModal?.classList.toggle("active");
    }
  });
}

/**
 * Render Markdown elements into safe, styled HTML with code blocks and copy buttons
 */
export function renderChatMarkdown(rawText) {
  if (!rawText) return "";

  // 1. Extract fenced code blocks and replace with tokens
  const codeBlocks = [];
  let processed = rawText.replace(/```(?:excel|vba|sql|m)?\n?([\s\S]*?)```/gi, (match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.trim());
    return `__CODE_BLOCK_${idx}__`;
  });

  // 2. Escape HTML for general text safety
  processed = escapeHtml(processed);

  // 3. Re-inject formatted code blocks
  codeBlocks.forEach((code, idx) => {
    const safeCode = escapeHtml(code);
    const blockHtml = `
      <div class="chat-code-block">
        <div class="chat-code-header">
          <span>Excel Formula / Code</span>
          <button type="button" class="btn-chat-copy" data-code="${safeCode}" title="Copy code to clipboard">📋 Copy</button>
        </div>
        <pre class="chat-code-content"><code>${safeCode}</code></pre>
      </div>
    `;
    processed = processed.replace(`__CODE_BLOCK_${idx}__`, blockHtml);
  });

  // 4. Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 5. Headings
  processed = processed.replace(/^###\s*(.+)$/gm, '<h5 style="margin:0.4rem 0 0.2rem; color:var(--accent-cyan); font-size:0.9rem;">$1</h5>');
  processed = processed.replace(/^##\s*(.+)$/gm, '<h4 style="margin:0.5rem 0 0.25rem; color:var(--text-bright); font-size:0.95rem;">$1</h4>');

  // 6. Bold & Italic
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 7. Blockquotes
  processed = processed.replace(/^(?:&gt;|>)\s*(.+)$/gm, '<blockquote style="border-left:3px solid var(--accent-cyan); margin:0.3rem 0; padding-left:0.6rem; color:var(--text-secondary); font-style:italic;">$1</blockquote>');

  // 8. Bullet points
  processed = processed.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
  processed = processed.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:0.3rem 0; padding-left:1.2rem;">$1</ul>');
  processed = processed.replace(/<\/ul>\s*<ul[^>]*>/g, '');

  // 9. Paragraphs
  const paragraphs = processed.split(/\n{2,}/).map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<div class=\"chat-code-block\"") || trimmed.startsWith("<ul") || trimmed.startsWith("<h") || trimmed.startsWith("<blockquote")) {
      return trimmed;
    }
    return `<p style="margin:0 0 0.4rem 0;">${trimmed.replace(/\n/g, "<br>")}</p>`;
  });

  return paragraphs.join("");
}

/**
 * Update Chatbot Context Bar Label based on active screen and task
 */
function updateChatbotContextLabel() {
  const labelEl = document.getElementById("chatbot-context-label");
  if (!labelEl) return;

  if (state.activeScreen === "screen-test" && state.currentTest) {
    const taskNum = state.selectedTaskNum || 1;
    const task = state.currentTest.test?.tasks?.find(t => (t.no || t.number) === taskNum);
    const cat = task?.category || "Excel";
    labelEl.textContent = `Active: Task ${taskNum} (${cat})`;
  } else if (state.activeScreen === "screen-drills") {
    labelEl.textContent = `Active: Workout Drills (${state.drillMode})`;
  } else {
    labelEl.textContent = "Ready for Excel questions";
  }
}

/**
 * Toggle Chatbot Widget Open / Closed
 */
function toggleChatbot(force) {
  const widget = document.getElementById("chatbot-widget");
  const launcher = document.getElementById("btn-chatbot-launcher");
  if (!widget) return;

  const shouldOpen = force !== undefined ? force : !state.isChatbotOpen;
  state.isChatbotOpen = shouldOpen;

  widget.classList.toggle("open", shouldOpen);
  widget.setAttribute("aria-hidden", String(!shouldOpen));

  if (launcher) {
    launcher.classList.toggle("active", shouldOpen);
  }

  if (shouldOpen) {
    updateChatbotContextLabel();
    const input = document.getElementById("chatbot-input");
    if (input) setTimeout(() => input.focus(), 150);
    // Scroll messages to bottom
    const messagesEl = document.getElementById("chatbot-messages");
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

/**
 * Extract active context for the chatbot prompt
 */
function getChatbotContext() {
  const useTaskContext = document.getElementById("chatbot-context-toggle")?.checked ?? true;
  if (!useTaskContext) return null;

  if (state.activeScreen === "screen-test" && state.currentTest) {
    const taskNum = state.selectedTaskNum || 1;
    const task = state.currentTest.test?.tasks?.find(t => (t.no || t.number) === taskNum) || {};
    const csvText = state.currentTest.syntheticCsv || state.currentTest.test?.syntheticCsv || "";
    const schema = parseDatasetSchema(csvText, "");
    const candidateFormula = state.taskProgress[taskNum]?.candidateFormula || "";

    return {
      taskNo: taskNum,
      category: task.category || "Excel",
      instruction: task.instruction || "",
      targetCell: task.targetCell || "",
      datasetName: state.currentTest.test?.title || "Active Dataset",
      columns: schema.columns.map(c => c.name),
      candidateFormula
    };
  }

  if (state.activeScreen === "screen-drills") {
    return {
      drillMode: state.drillMode || "scenario",
      topic: document.getElementById("select-drill-topic")?.value || "Excel"
    };
  }

  return null;
}

/**
 * Send user message and fetch assistant response
 */
async function handleSendChatMessage(customQuery) {
  const inputEl = document.getElementById("chatbot-input");
  const messagesEl = document.getElementById("chatbot-messages");
  const sendBtn = document.getElementById("btn-chatbot-send");
  if (!messagesEl) return;

  const userQuery = (customQuery || inputEl?.value || "").trim();
  if (!userQuery || state.isChatbotWaiting) return;

  // Clear input
  if (inputEl) {
    inputEl.value = "";
    inputEl.style.height = "auto";
  }

  // 1. Append User Message
  state.chatbotHistory.push({ role: "user", text: userQuery });
  const userMsgEl = document.createElement("div");
  userMsgEl.className = "chat-message user";
  userMsgEl.innerHTML = `<div class="chat-bubble"><p>${escapeHtml(userQuery)}</p></div>`;
  messagesEl.appendChild(userMsgEl);

  // 2. Append Typing Indicator
  state.isChatbotWaiting = true;
  if (sendBtn) sendBtn.disabled = true;

  const typingEl = document.createElement("div");
  typingEl.className = "chat-message assistant chat-typing-container";
  typingEl.id = "chat-typing-indicator";
  typingEl.innerHTML = `
    <div class="chat-avatar">🤖</div>
    <div class="chat-typing">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // 3. Fetch response
  try {
    const context = getChatbotContext();
    const apiKey = Storage.getGeminiKey();
    const model = Storage.getGeminiModel();

    const responseText = await Gemini.askChatbotAssistant({
      message: userQuery,
      history: state.chatbotHistory,
      context,
      apiKey,
      model
    });

    // Remove typing indicator
    document.getElementById("chat-typing-indicator")?.remove();

    // Append Assistant Message
    state.chatbotHistory.push({ role: "assistant", text: responseText });

    const assistantMsgEl = document.createElement("div");
    assistantMsgEl.className = "chat-message assistant";
    assistantMsgEl.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble">${renderChatMarkdown(responseText)}</div>
    `;

    // Wire copy buttons inside this message
    assistantMsgEl.querySelectorAll(".btn-chat-copy").forEach(copyBtn => {
      copyBtn.addEventListener("click", () => {
        const codeText = copyBtn.dataset.code || "";
        if (codeText && navigator.clipboard) {
          navigator.clipboard.writeText(codeText).then(() => {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1400);
          }).catch(() => {
            const textarea = document.createElement("textarea");
            textarea.value = codeText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1400);
          });
        }
      });
    });

    messagesEl.appendChild(assistantMsgEl);
  } catch (err) {
    document.getElementById("chat-typing-indicator")?.remove();
    const errorMsgEl = document.createElement("div");
    errorMsgEl.className = "chat-message assistant";
    errorMsgEl.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble" style="border-color: rgba(244,63,94,0.4);">
        <p style="color: var(--accent-rose);"><strong>Error:</strong> ${escapeHtml(err.message || "Failed to retrieve response")}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Check your network or verify your Gemini API key in Settings.</p>
      </div>
    `;
    messagesEl.appendChild(errorMsgEl);
  } finally {
    state.isChatbotWaiting = false;
    if (sendBtn) sendBtn.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (inputEl) inputEl.focus();
  }
}

/**
 * Initialize Chatbot Event Listeners & Quick Chips
 */
function initChatbotUI() {
  const launcher = document.getElementById("btn-chatbot-launcher");
  const closeBtn = document.getElementById("btn-close-chat");
  const clearBtn = document.getElementById("btn-clear-chat");
  const form = document.getElementById("chatbot-form");
  const textarea = document.getElementById("chatbot-input");

  launcher?.addEventListener("click", () => toggleChatbot());
  closeBtn?.addEventListener("click", () => toggleChatbot(false));

  clearBtn?.addEventListener("click", () => {
    state.chatbotHistory = [];
    const messagesEl = document.getElementById("chatbot-messages");
    if (messagesEl) {
      messagesEl.innerHTML = `
        <div class="chat-message assistant">
          <div class="chat-avatar">🤖</div>
          <div class="chat-bubble">
            <p><strong>Chat cleared!</strong></p>
            <p>Ask me anything about Excel formulas, Power Query M code, DAX, or interview trade-offs.</p>
          </div>
        </div>
      `;
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSendChatMessage();
  });

  // Textarea Enter key & auto-resize
  textarea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  });

  textarea?.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  });

  // Quick Chips
  document.querySelectorAll(".chat-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const query = chip.dataset.query;
      if (query) {
        if (!state.isChatbotOpen) toggleChatbot(true);
        handleSendChatMessage(query);
      }
    });
  });
}

// ==========================================================================
// Phase 5: Spaced Repetition Review (SRS)
// ==========================================================================
export function startSRSReview() {
  const items = Storage.getDueSRSItems();
  if (!items || items.length === 0) {
    alert("🎉 No tasks due for review today! Great job staying on top of your practice.");
    return;
  }
  state.isSRSReviewMode = true;
  state.srsQueue = items;
  state.srsCurrentIdx = 0;

  switchScreen("screen-test");
  const overlay = document.getElementById("srs-review-overlay");
  const mockWin = document.querySelector(".excel-mock-window");
  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.style.display = "block";
  }
  if (mockWin) mockWin.style.display = "none";

  renderSRSReviewCard(0);
}

export function renderSRSReviewCard(idx) {
  if (!state.srsQueue || idx >= state.srsQueue.length) {
    finishSRSReview();
    return;
  }
  const item = state.srsQueue[idx];
  const counterEl = document.getElementById("srs-review-counter");
  const catEl = document.getElementById("srs-review-category");
  const instEl = document.getElementById("srs-review-instruction");
  const inputEl = document.getElementById("srs-formula-input");

  if (counterEl) counterEl.textContent = `Review ${idx + 1} of ${state.srsQueue.length}`;
  if (catEl) catEl.textContent = item.category || "General";
  if (instEl) instEl.textContent = item.taskInstruction || "Review this task and attempt the formula.";
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
}

export function handleSRSRating(rating) {
  if (!state.srsQueue || state.srsCurrentIdx >= state.srsQueue.length) return;
  const item = state.srsQueue[state.srsCurrentIdx];
  Storage.updateSRSItem(item.taskId, rating);
  state.srsCurrentIdx++;
  if (state.srsCurrentIdx < state.srsQueue.length) {
    renderSRSReviewCard(state.srsCurrentIdx);
  } else {
    finishSRSReview();
  }
}

export function finishSRSReview() {
  const count = state.srsQueue ? state.srsQueue.length : 0;
  state.isSRSReviewMode = false;
  state.srsQueue = [];
  state.srsCurrentIdx = 0;

  const overlay = document.getElementById("srs-review-overlay");
  const mockWin = document.querySelector(".excel-mock-window");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }
  if (mockWin) mockWin.style.display = "block";

  Storage.logActivity(null, { srsReviewed: count });
  updateProgressDashboard();
  switchScreen("screen-progress");
  alert(`✅ Spaced Repetition Review Complete!\nYou reviewed ${count} task${count === 1 ? '' : 's'}. Next review intervals have been scheduled.`);
}

// ==========================================================================
// Phase 5: Daily Interview Gauntlet
// ==========================================================================
export async function checkDailyGauntlet() {
  const data = Storage.getGauntletData();
  const streakEl = document.getElementById("gauntlet-streak");
  if (streakEl) {
    streakEl.textContent = `🔥 ${data.currentStreak || 0}-day streak`;
  }

  const toggle = document.getElementById("gauntlet-use-my-level");
  if (toggle) {
    toggle.checked = (data.difficultyOverride === "user");
    toggle.onchange = async (e) => {
      const overrideVal = e.target.checked ? "user" : null;
      Storage.setGauntletDifficultyOverride(overrideVal);
      const todayQ = Storage.getTodayGauntlet();
      if (!todayQ) {
        await generateAndRenderTodayGauntlet();
      } else {
        const body = document.getElementById("gauntlet-body");
        const existingNote = document.getElementById("gauntlet-diff-note");
        if (!existingNote && body) {
          const note = document.createElement("div");
          note.id = "gauntlet-diff-note";
          note.style.cssText = "font-size:0.8rem; color:var(--accent-amber); margin-top:0.5rem;";
          note.textContent = "ℹ️ Difficulty preference saved. It will apply starting from tomorrow's gauntlet.";
          body.appendChild(note);
        }
      }
    };
  }

  const today = Storage.getTodayGauntlet();
  if (today && today.answered) {
    renderGauntletComplete(today, data);
  } else if (today) {
    renderGauntletCard(today);
  } else {
    await generateAndRenderTodayGauntlet();
  }
}

export async function generateAndRenderTodayGauntlet() {
  const data = Storage.getGauntletData();
  const difficulty = data.difficultyOverride === "user" ? (state.difficulty || "intermediate") : "intermediate";
  const body = document.getElementById("gauntlet-body");
  if (body) {
    body.innerHTML = `<div class="gauntlet-loading" style="color:var(--text-muted); font-size:0.9rem;">⚡ Gemini is curating today's timed interview gauntlet question (${difficulty})...</div>`;
  }

  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();
  const stats = Storage.getProgressStats();
  const weakCats = Object.keys(stats.weakCategories || {});

  try {
    const questionObj = await Gemini.generateDailyGauntlet({
      difficulty,
      weakCategories: weakCats,
      apiKey,
      model
    });
    const saved = Storage.saveGauntletQuestion(questionObj);
    renderGauntletCard(saved);
  } catch (err) {
    console.error("Gauntlet generation error:", err);
    if (body) {
      body.innerHTML = `<p style="color:var(--accent-rose);">Failed to load today's question. Click to retry.</p><button class="btn btn-sm btn-secondary" id="btn-retry-gauntlet">Retry</button>`;
      document.getElementById("btn-retry-gauntlet")?.addEventListener("click", generateAndRenderTodayGauntlet);
    }
  }
}

export function renderGauntletCard(entry) {
  const body = document.getElementById("gauntlet-body");
  if (!body) return;

  if (state.gauntletTimerId) {
    clearInterval(state.gauntletTimerId);
    state.gauntletTimerId = null;
  }
  state.gauntletRemainingSecs = 180;

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
      <span class="brand-badge" style="background:rgba(245,158,11,0.15); color:var(--accent-amber); border-color:rgba(245,158,11,0.3);">
        ${escapeHtml(entry.category || "General")} • ${escapeHtml(entry.difficulty || "Intermediate")}
      </span>
      <div class="gauntlet-timer" id="gauntlet-timer-clock">⏱️ 03:00</div>
    </div>
    <div class="gauntlet-question">${escapeHtml(entry.question)}</div>
    <textarea id="gauntlet-answer-input" class="gauntlet-answer-area" placeholder="Type your answer or formula solution here..."></textarea>
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
      <span style="font-size:0.8rem; color:var(--text-muted);">💡 3-minute timed sprint — simulate high-pressure screening</span>
      <button class="btn btn-primary" id="btn-submit-gauntlet" style="background:linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color:#F59E0B;">
        Submit Answer ⚡
      </button>
    </div>
  `;

  const timerClock = document.getElementById("gauntlet-timer-clock");
  state.gauntletTimerId = setInterval(() => {
    state.gauntletRemainingSecs--;
    const mins = String(Math.floor(state.gauntletRemainingSecs / 60)).padStart(2, "0");
    const secs = String(state.gauntletRemainingSecs % 60).padStart(2, "0");
    if (timerClock) {
      timerClock.textContent = `⏱️ ${mins}:${secs}`;
      if (state.gauntletRemainingSecs <= 30) {
        timerClock.classList.add("urgent");
      }
    }
    if (state.gauntletRemainingSecs <= 0) {
      clearInterval(state.gauntletTimerId);
      state.gauntletTimerId = null;
      submitGauntletAnswer(entry);
    }
  }, 1000);

  document.getElementById("btn-submit-gauntlet")?.addEventListener("click", () => {
    submitGauntletAnswer(entry);
  });
}

export async function submitGauntletAnswer(entry) {
  if (state.gauntletTimerId) {
    clearInterval(state.gauntletTimerId);
    state.gauntletTimerId = null;
  }
  const inputEl = document.getElementById("gauntlet-answer-input");
  const userAnswer = inputEl ? inputEl.value : "";
  const submitBtn = document.getElementById("btn-submit-gauntlet");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Grading with AI...";
  }

  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();

  try {
    const result = await Gemini.gradeGauntletAnswer({
      question: entry.question,
      expectedAnswer: entry.expectedAnswer,
      userAnswer,
      apiKey,
      model
    });

    Storage.markGauntletAnswered(entry.date, userAnswer, result.score, result.feedback);
    Storage.logActivity(null, { gauntletAnswered: true, gauntletScore: result.score });

    const streakData = Storage.getGauntletStreak();
    const streakEl = document.getElementById("gauntlet-streak");
    if (streakEl) {
      streakEl.textContent = `🔥 ${streakData.currentStreak}-day streak`;
    }

    renderGauntletFeedback(result, entry);
  } catch (err) {
    console.error("Gauntlet grading failed:", err);
  }
}

export function renderGauntletFeedback(result, entry) {
  const body = document.getElementById("gauntlet-body");
  if (!body) return;

  const scoreClass = result.score >= 8 ? "high" : (result.score >= 5 ? "mid" : "low");

  body.innerHTML = `
    <div class="gauntlet-feedback-card">
      <div class="gauntlet-score-ring">
        <div class="gauntlet-score-badge ${scoreClass}">
          ${result.score}<span style="font-size:1rem; color:var(--text-muted);">/10</span>
        </div>
        <div>
          <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-bright); margin-bottom:0.25rem;">
            ${result.score >= 8 ? "🎯 Outstanding!" : (result.score >= 5 ? "👍 Good Answer" : "📚 Needs Work")}
          </h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">
            ${escapeHtml(result.feedback)}
          </p>
        </div>
      </div>

      <div style="background:#090D16; border:1px solid var(--glass-border); border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.85rem;">
        <span style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.3rem;">Expected Answer:</span>
        <code style="color:#38BDF8; font-family:monospace; font-size:0.92rem;">${escapeHtml(result.correctAnswer || entry.expectedAnswer)}</code>
      </div>

      ${result.improvement ? `
        <div style="background:rgba(245,158,11,0.1); border-left:3px solid var(--accent-amber); padding:0.75rem 1rem; border-radius:0 6px 6px 0; margin-bottom:1rem; font-size:0.85rem; color:#FDE68A;">
          <strong>💡 Interview Edge:</strong> ${escapeHtml(result.improvement)}
        </div>
      ` : ""}

      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:0.85rem;">
        <span style="font-size:0.82rem; color:var(--text-muted);">Streak updated! Return tomorrow for the next challenge.</span>
        <div class="gauntlet-week-dots">
          ${renderGauntletWeekDots()}
        </div>
      </div>
    </div>
  `;
}

export function renderGauntletComplete(entry, data) {
  const body = document.getElementById("gauntlet-body");
  if (!body) return;

  body.innerHTML = `
    <div style="text-align:center; padding:1.25rem 1rem;">
      <div style="font-size:2rem; margin-bottom:0.4rem;">🎉</div>
      <h4 style="font-size:1.15rem; font-weight:700; color:var(--text-bright); margin-bottom:0.25rem;">
        Today's Interview Gauntlet Completed!
      </h4>
      <p style="font-size:0.85rem; color:var(--text-secondary); max-width:480px; margin:0 auto 1rem;">
        You scored <strong>${entry.score ?? "10"}/10</strong> on today's challenge. Your current streak is <strong>${data.currentStreak || 1} day${(data.currentStreak || 1) === 1 ? '' : 's'}</strong>!
      </p>
      <div style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:0.75rem;">
        ${renderGauntletWeekDots()}
      </div>
      <span style="font-size:0.78rem; color:var(--text-muted);">Come back tomorrow for your next timed interview sprint!</span>
    </div>
  `;
}

export function renderGauntletWeekDots() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (new Date().getDay() + 6) % 7;
  return days.map((day, i) => {
    const isDone = i <= todayIdx;
    return `<div class="gauntlet-week-dot ${isDone ? 'done' : ''}" title="${day}">${isDone ? '✓' : day}</div>`;
  }).join("");
}

// ==========================================================================
// Phase 5: Verbal Defense Mode
// ==========================================================================
export async function generateVerbalDefenseDrill() {
  const topicSelect = document.getElementById("select-drill-topic");
  const selectedName = topicSelect ? topicSelect.value : "";
  
  const matched = VERBAL_DEFENSE_TOPICS.find(t => t.topic.toLowerCase().includes(selectedName.toLowerCase())) 
    || VERBAL_DEFENSE_TOPICS[Math.floor(Math.random() * VERBAL_DEFENSE_TOPICS.length)];

  const area = document.getElementById("verbal-defense-area");
  const qContainer = document.getElementById("drill-questions-container");
  if (qContainer) qContainer.style.display = "none";
  if (area) {
    area.classList.remove("hidden");
    area.style.display = "block";
  }

  const promptEl = document.getElementById("verbal-prompt");
  const contextEl = document.getElementById("verbal-context-panel");
  if (promptEl) promptEl.textContent = "Loading verbal scenario from Gemini...";
  if (contextEl) contextEl.textContent = "Consulting interview coach...";

  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();

  try {
    const drillObj = await Gemini.generateVerbalDefenseDrill({
      topic: matched.topic,
      category: matched.category,
      difficulty: state.difficulty,
      apiKey,
      model
    });
    renderVerbalDefenseCard(drillObj);
  } catch (err) {
    console.error("Verbal defense drill error:", err);
  }
}

export function renderVerbalDefenseCard(drillObj) {
  state.currentVerbalDrill = drillObj;
  const contextEl = document.getElementById("verbal-context-panel");
  const promptEl = document.getElementById("verbal-prompt");
  const inputEl = document.getElementById("verbal-defense-input");
  const charCountEl = document.getElementById("verbal-char-count");
  const submitBtn = document.getElementById("btn-submit-defense");
  const feedbackArea = document.getElementById("verbal-feedback-area");

  if (contextEl) contextEl.textContent = drillObj.context || drillObj.scenario;
  if (promptEl) promptEl.textContent = drillObj.prompt;
  if (inputEl) {
    inputEl.value = "";
    inputEl.disabled = false;
  }
  if (charCountEl) charCountEl.textContent = "0";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submit Defense →";
  }
  if (feedbackArea) {
    feedbackArea.classList.add("hidden");
    feedbackArea.style.display = "none";
    feedbackArea.innerHTML = "";
  }

  if (inputEl) {
    inputEl.oninput = (e) => {
      const len = e.target.value.length;
      if (charCountEl) charCountEl.textContent = len;
      if (submitBtn) {
        submitBtn.disabled = (len < 20);
      }
    };
  }
}

export async function submitVerbalDefense() {
  if (!state.currentVerbalDrill) return;
  const inputEl = document.getElementById("verbal-defense-input");
  const userResponse = inputEl ? inputEl.value.trim() : "";
  if (userResponse.length < 20) return;

  const submitBtn = document.getElementById("btn-submit-defense");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Grading with Gemini...";
  }

  const apiKey = Storage.getGeminiKey();
  const model = Storage.getGeminiModel();

  try {
    const result = await Gemini.gradeVerbalDefense({
      question: state.currentVerbalDrill.prompt,
      context: state.currentVerbalDrill.context || state.currentVerbalDrill.scenario,
      userResponse,
      apiKey,
      model
    });

    Storage.saveVerbalSession({
      topic: state.currentVerbalDrill.topic || "Verbal Defense",
      category: state.currentVerbalDrill.category || "lookup",
      question: state.currentVerbalDrill.prompt,
      userResponse,
      scores: result.scores,
      total: result.total,
      feedback: result.feedback,
      improvedPhrase: result.improvedPhrase
    });

    renderVerbalDefenseFeedback(result, state.currentVerbalDrill);
  } catch (err) {
    console.error("Verbal defense submission failed:", err);
  }
}

export function renderVerbalDefenseFeedback(result, drillObj) {
  const feedbackArea = document.getElementById("verbal-feedback-area");
  if (!feedbackArea) return;

  const scores = result.scores || { accuracy: 2, clarity: 2, interviewLanguage: 3 };
  const total = typeof result.total === "number" ? result.total : (scores.accuracy + scores.clarity + scores.interviewLanguage);
  const badgeClass = total >= 8 ? "high" : (total >= 5 ? "mid" : "low");

  feedbackArea.classList.remove("hidden");
  feedbackArea.style.display = "block";
  feedbackArea.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
      <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-bright);">Interview Evaluation Breakdown</h3>
      <div class="verbal-score-badge gauntlet-score-badge ${badgeClass}">
        ${total}<span style="font-size:0.9rem; color:var(--text-muted);">/10</span>
      </div>
    </div>

    <div class="verbal-score-row">
      <div class="verbal-score-card">
        <h4>Technical Accuracy</h4>
        <div class="score">${scores.accuracy}<span style="font-size:0.8rem; color:var(--text-muted);">/3</span></div>
        <div class="verbal-score-bar">
          <div class="verbal-score-bar-fill" style="width: ${(scores.accuracy / 3) * 100}%;"></div>
        </div>
      </div>
      <div class="verbal-score-card">
        <h4>Clarity & Structure</h4>
        <div class="score">${scores.clarity}<span style="font-size:0.8rem; color:var(--text-muted);">/3</span></div>
        <div class="verbal-score-bar">
          <div class="verbal-score-bar-fill" style="width: ${(scores.clarity / 3) * 100}%;"></div>
        </div>
      </div>
      <div class="verbal-score-card">
        <h4>Interview Language</h4>
        <div class="score">${scores.interviewLanguage}<span style="font-size:0.8rem; color:var(--text-muted);">/4</span></div>
        <div class="verbal-score-bar">
          <div class="verbal-score-bar-fill" style="width: ${(scores.interviewLanguage / 4) * 100}%;"></div>
        </div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:8px; padding:1rem; margin-bottom:1rem;">
      <strong style="color:var(--accent-cyan); font-size:0.85rem; display:block; margin-bottom:0.35rem;">Evaluation Feedback:</strong>
      <p style="color:var(--text-primary); font-size:0.92rem; margin:0; line-height:1.55;">
        ${escapeHtml(result.feedback)}
      </p>
    </div>

    <div class="verbal-model-answer">
      <h4>✨ Model Answer (10/10 Interview Response):</h4>
      <p>${escapeHtml(result.improvedPhrase)}</p>
    </div>

    <div style="margin-top:1.25rem; text-align:right;">
      <button class="btn btn-secondary" id="btn-verbal-next" style="margin-right:0.5rem;">
        Practice Another Scenario 🔄
      </button>
    </div>
  `;

  document.getElementById("btn-verbal-next")?.addEventListener("click", () => {
    generateVerbalDefenseDrill();
  });
}

