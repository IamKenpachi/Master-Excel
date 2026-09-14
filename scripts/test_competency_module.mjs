// scripts/test_competency_module.mjs
// Automated verification suite for Module 2: CV Competency-Based Interviewer

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("  EXCELCOACH AI — MODULE 2 (CV COMPETENCY INTERVIEWER) VERIFICATION SUITE");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Group 1: HTML Markup Structure (index.html)
// -----------------------------------------------------------------------------
console.log("--- Group 1: HTML Markup Structure ---");
const html = fs.readFileSync("index.html", "utf-8");

test("HTML-01: Top-level dual-module switcher exists in header", () => {
  assert(html.includes('id="module-switcher"'), "Missing #module-switcher");
  assert(html.includes('id="btn-module-excel"'), "Missing #btn-module-excel");
  assert(html.includes('id="btn-module-competency"'), "Missing #btn-module-competency");
  assert(html.includes('id="nav-links-excel"'), "Missing #nav-links-excel");
});

test("HTML-02: #screen-competency section exists with hero & 6 pillar previews", () => {
  assert(html.includes('id="screen-competency"'), "Missing #screen-competency");
  assert(html.includes('class="competency-hero-card"'), "Missing .competency-hero-card");
  assert(html.includes("CV-Anchored Competency Interview Simulator"), "Missing hero title");
  assert(html.includes("Business Impact"), "Missing Business Impact pillar");
  assert(html.includes("Storytelling"), "Missing Storytelling pillar");
  assert(html.includes("Dirty Data & Ambiguity"), "Missing Dirty Data pillar");
  assert(html.includes("Prioritization"), "Missing Prioritization pillar");
  assert(html.includes("Process Automation"), "Missing Automation pillar");
  assert(html.includes("Failure & Learning"), "Missing Failure & Learning pillar");
});

test("HTML-03: CV intake card contains dropzone, paste area, seniority selector, and buttons", () => {
  assert(html.includes('id="cv-intake-card"'), "Missing #cv-intake-card");
  assert(html.includes('id="cv-dropzone"'), "Missing #cv-dropzone");
  assert(html.includes('id="input-cv-file"'), "Missing #input-cv-file");
  assert(html.includes('id="input-cv-paste"'), "Missing #input-cv-paste");
  assert(html.includes('id="cv-status-banner"'), "Missing #cv-status-banner");
  assert(html.includes('id="seniority-selector"'), "Missing #seniority-selector");
  assert(html.includes('id="select-competency-industry"'), "Missing #select-competency-industry");
  assert(html.includes('id="select-competency-depth"'), "Missing #select-competency-depth");
  assert(html.includes('id="btn-generate-competency"'), "Missing #btn-generate-competency");
  assert(html.includes('id="btn-load-sample-cv"'), "Missing #btn-load-sample-cv");
  assert(html.includes('id="btn-clear-cv"'), "Missing #btn-clear-cv");
});

test("HTML-04: Competency results dashboard contains strategy banner, filters, and questions grid", () => {
  assert(html.includes('id="competency-dashboard"'), "Missing #competency-dashboard");
  assert(html.includes('id="competency-strategy-banner"'), "Missing #competency-strategy-banner");
  assert(html.includes('id="competency-pillar-filters"'), "Missing #competency-pillar-filters");
  assert(html.includes('id="input-search-competency"'), "Missing #input-search-competency");
  assert(html.includes('id="competency-questions-grid"'), "Missing #competency-questions-grid");
  assert(html.includes('id="btn-print-competency-sheet"'), "Missing #btn-print-competency-sheet");
});

test("HTML-05: Interactive practice & evaluation modal exists with STAR inputs and eval card", () => {
  assert(html.includes('id="modal-competency-practice"'), "Missing #modal-competency-practice");
  assert(html.includes('id="practice-modal-question-text"'), "Missing #practice-modal-question-text");
  assert(html.includes('id="practice-modal-cv-anchor"'), "Missing #practice-modal-cv-anchor");
  assert(html.includes('id="input-practice-full"'), "Missing #input-practice-full");
  assert(html.includes('id="practice-guided-container"'), "Missing #practice-guided-container");
  assert(html.includes('id="input-star-s"'), "Missing #input-star-s");
  assert(html.includes('id="input-star-t"'), "Missing #input-star-t");
  assert(html.includes('id="input-star-a"'), "Missing #input-star-a");
  assert(html.includes('id="input-star-r"'), "Missing #input-star-r");
  assert(html.includes('id="btn-submit-competency-eval"'), "Missing #btn-submit-competency-eval");
  assert(html.includes('id="practice-eval-card"'), "Missing #practice-eval-card");
});

// -----------------------------------------------------------------------------
// Group 2: CSS Stylesheet (style.css)
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: CSS Styling & Glassmorphic Rules ---");
const css = fs.readFileSync("style.css", "utf-8");

test("CSS-01: Module switcher & active pill button styles exist", () => {
  assert(css.includes(".module-switcher"), "Missing .module-switcher");
  assert(css.includes(".module-btn.active"), "Missing .module-btn.active");
  assert(css.includes(".module-icon"), "Missing .module-icon");
});

test("CSS-02: Competency Hero and 6 Pillar Preview tags exist", () => {
  assert(css.includes(".competency-hero-card"), "Missing .competency-hero-card");
  assert(css.includes(".pillar-pill"), "Missing .pillar-pill");
  assert(css.includes(".pillar-pill:hover"), "Missing .pillar-pill:hover");
});

test("CSS-03: CV dropzone, dragover, and paste styles exist", () => {
  assert(css.includes(".cv-dropzone"), "Missing .cv-dropzone");
  assert(css.includes(".cv-dropzone.dragover"), "Missing .cv-dropzone.dragover");
  assert(css.includes(".cv-status-banner"), "Missing .cv-status-banner");
  assert(css.includes(".cv-textarea"), "Missing .cv-textarea");
});

test("CSS-04: Competency question cards, pillar badges, and CV anchor callout exist", () => {
  assert(css.includes(".competency-card"), "Missing .competency-card");
  assert(css.includes(".pillar-tag.impact"), "Missing .pillar-tag.impact");
  assert(css.includes(".pillar-tag.learning"), "Missing .pillar-tag.learning");
  assert(css.includes(".cv-anchor-callout"), "Missing .cv-anchor-callout");
  assert(css.includes(".star-blueprint-mini-grid"), "Missing .star-blueprint-mini-grid");
});

test("CSS-05: AI recruiter evaluation report card & verdict badges exist", () => {
  assert(css.includes(".competency-eval-card"), "Missing .competency-eval-card");
  assert(css.includes(".eval-verdict-badge.strong-hire"), "Missing .eval-verdict-badge.strong-hire");
  assert(css.includes(".eval-verdict-badge.needs-work"), "Missing .eval-verdict-badge.needs-work");
  assert(css.includes(".star-checklist-row"), "Missing .star-checklist-row");
  assert(css.includes(".green-flags-box"), "Missing .green-flags-box");
  assert(css.includes(".red-flags-box"), "Missing .red-flags-box");
});

// -----------------------------------------------------------------------------
// Group 3: Prompt Engineering (prompts.js)
// -----------------------------------------------------------------------------
console.log("\n--- Group 3: Competency Prompt Builders ---");
import { COMPETENCY_PILLARS, buildCompetencyQuestionPrompt, buildCompetencyEvaluationPrompt } from "../prompts.js";

test("PROMPT-01: COMPETENCY_PILLARS defines all 6 data analyst competency pillars", () => {
  assert(Array.isArray(COMPETENCY_PILLARS), "COMPETENCY_PILLARS must be an array");
  assert.strictEqual(COMPETENCY_PILLARS.length, 6, "Must define exactly 6 pillars");
  const ids = COMPETENCY_PILLARS.map(p => p.id);
  assert(ids.includes("impact"), "Missing impact pillar");
  assert(ids.includes("storytelling"), "Missing storytelling pillar");
  assert(ids.includes("ambiguity"), "Missing ambiguity pillar");
  assert(ids.includes("prioritization"), "Missing prioritization pillar");
  assert(ids.includes("automation"), "Missing automation pillar");
  assert(ids.includes("learning"), "Missing learning pillar");
});

test("PROMPT-02: buildCompetencyQuestionPrompt injects candidate CV, seniority, and JSON schema", () => {
  const prompt = buildCompetencyQuestionPrompt({
    cvText: "Built automated Excel reporting suite saving 10 hours weekly.",
    seniority: "senior",
    industry: "FinTech",
    count: 8
  });
  assert(prompt.includes("Built automated Excel reporting suite"), "Must include CV text");
  assert(prompt.includes("Senior Data Analyst"), "Must calibrate seniority");
  assert(prompt.includes("FinTech"), "Must include target industry");
  assert(prompt.includes("cvAnchor"), "Schema must request cvAnchor");
  assert(prompt.includes("recruiterIntent"), "Schema must request recruiterIntent");
  assert(prompt.includes("starBlueprint"), "Schema must request starBlueprint");
});

test("PROMPT-03: buildCompetencyEvaluationPrompt formats question context and candidate STAR response", () => {
  const prompt = buildCompetencyEvaluationPrompt({
    questionObj: {
      question: "Tell me about a time you handled dirty data.",
      pillar: "ambiguity",
      pillarLabel: "Dirty Data & Ambiguity Resolution",
      cvAnchor: "Cleaned multi-year transaction database",
      recruiterIntent: "Probes data hygiene protocols"
    },
    cvText: "Sample CV",
    candidateAnswer: "Situation: We had missing primary keys. Task: Reconcile accounts. Action: Built Power Query lookup rules. Result: 100% match rate.",
    seniority: "mid"
  });
  assert(prompt.includes("Tell me about a time you handled dirty data"), "Must include question");
  assert(prompt.includes("Dirty Data & Ambiguity Resolution"), "Must include pillar");
  assert(prompt.includes("Cleaned multi-year transaction database"), "Must include CV anchor");
  assert(prompt.includes("Situation: We had missing primary keys"), "Must include candidate answer");
  assert(prompt.includes("starBreakdown"), "Schema must request starBreakdown");
  assert(prompt.includes("STRONG HIRE"), "Must specify verdict standards");
});

// -----------------------------------------------------------------------------
// Group 4: Gemini Engine & Offline Question Bank (gemini.js)
// -----------------------------------------------------------------------------
console.log("\n--- Group 4: Offline Bank & Evaluation Engine ---");
import { Gemini, SAMPLE_OFFLINE_COMPETENCY_QUESTIONS } from "../gemini.js";

test("OFFLINE-01: SAMPLE_OFFLINE_COMPETENCY_QUESTIONS provides rich 6-pillar question bank", () => {
  assert(Array.isArray(SAMPLE_OFFLINE_COMPETENCY_QUESTIONS), "Must be an array");
  assert(SAMPLE_OFFLINE_COMPETENCY_QUESTIONS.length >= 6, "Must have at least 6 sample questions");

  SAMPLE_OFFLINE_COMPETENCY_QUESTIONS.forEach(q => {
    assert(q.id, "Question must have an ID");
    assert(q.pillar, "Question must specify pillar");
    assert(q.pillarLabel, "Question must specify pillarLabel");
    assert(q.cvAnchor, "Question must have cvAnchor");
    assert(q.question, "Question must have question text");
    assert(q.recruiterIntent, "Question must have recruiterIntent");
    assert(q.starBlueprint, "Question must have starBlueprint");
    assert(q.starBlueprint.situation, "STAR must have situation");
    assert(q.starBlueprint.task, "STAR must have task");
    assert(q.starBlueprint.action, "STAR must have action");
    assert(q.starBlueprint.result, "STAR must have result");
  });
});

test("OFFLINE-02: Gemini.getOfflineCompetencyData returns complete candidate blueprint", () => {
  const data = Gemini.getOfflineCompetencyData("senior", "E-Commerce");
  assert.strictEqual(data.targetSeniority, "senior");
  assert.strictEqual(data.targetIndustry, "E-Commerce");
  assert.strictEqual(data.isOfflineDemo, true);
  assert(Array.isArray(data.questions) && data.questions.length >= 6);
});

await asyncTest("OFFLINE-03: Gemini.evaluateCompetencyAnswer provides heuristic evaluation without API key", async () => {
  const qObj = SAMPLE_OFFLINE_COMPETENCY_QUESTIONS[0];
  const candidateAnswer = `
    Situation: At my previous company Apex Retail, our executive leadership was making supply decisions without visibility into promotional cannibalization.
    Task: As the Senior Commercial Analyst, my responsibility was to build an automated SKU margin model to quantify the revenue leakage.
    Action: I extracted 250,000 transaction records using SQL, cleaned them in Power Query, and built an interactive dynamic array matrix in Excel using XLOOKUP and SUMIFS. I presented these findings directly to the VP of Merchandising.
    Result: We discovered that 22% of discounted clearance SKUs directly cannibalized full-price items, allowing us to adjust promotional strategy and recover $1.2M in annual profit margin.
  `;

  const evalResult = await Gemini.evaluateCompetencyAnswer({
    questionObj: qObj,
    candidateAnswer,
    seniority: "senior",
    apiKey: "" // Offline mode
  });

  assert(typeof evalResult.score === "number", "Score must be a number");
  assert(evalResult.score >= 7.0, "Strong STAR answer should score high");
  assert(evalResult.verdict === "STRONG HIRE" || evalResult.verdict === "HIRE", "Verdict should be Hire or Strong Hire");
  assert(evalResult.starBreakdown.situation === true, "Situation should be recognized");
  assert(evalResult.starBreakdown.task === true, "Task should be recognized");
  assert(evalResult.starBreakdown.action === true, "Action should be recognized");
  assert(evalResult.starBreakdown.result === true, "Result should be recognized");
  assert(Array.isArray(evalResult.greenFlags) && evalResult.greenFlags.length > 0, "Must have green flags");
  assert(evalResult.modelAnswer, "Must provide model answer");
  assert(evalResult.coachingTip, "Must provide coaching tip");
});

// -----------------------------------------------------------------------------
// Group 5: App Controller & Sample CV (app.js)
// -----------------------------------------------------------------------------
console.log("\n--- Group 5: Application Controller & State ---");
import { SAMPLE_ANALYST_CV, switchModule, state } from "../app.js";

test("APP-01: SAMPLE_ANALYST_CV is comprehensive with real companies, metrics, and tools", () => {
  assert(typeof SAMPLE_ANALYST_CV === "string", "SAMPLE_ANALYST_CV must be string");
  assert(SAMPLE_ANALYST_CV.length > 500, "SAMPLE_ANALYST_CV should be comprehensive");
  assert(SAMPLE_ANALYST_CV.includes("SARAH JENNINGS"), "Must include candidate name");
  assert(SAMPLE_ANALYST_CV.includes("Apex Global Retail"), "Must include experience company");
  assert(SAMPLE_ANALYST_CV.includes("XLOOKUP"), "Must include Excel tools");
  assert(SAMPLE_ANALYST_CV.includes("$1.2M"), "Must include quantifiable metrics");
});

test("APP-02: state object contains competency module state", () => {
  assert(state.currentModule !== undefined, "state.currentModule must exist");
  assert(state.competency !== undefined, "state.competency must exist");
  assert.strictEqual(typeof state.competency.seniority, "string");
  assert.strictEqual(typeof state.competency.industry, "string");
  assert.strictEqual(typeof state.competency.depth, "number");
});

test("APP-03: switchModule safely toggles module state without throwing", () => {
  // In Node environment without full DOM elements, switchModule should handle gracefully
  assert.doesNotThrow(() => {
    switchModule("competency");
    assert.strictEqual(state.currentModule, "competency");
    switchModule("excel");
    assert.strictEqual(state.currentModule, "excel");
  });
});

// -----------------------------------------------------------------------------
// Group 6: Export & Prep Sheet (export.js)
// -----------------------------------------------------------------------------
console.log("\n--- Group 6: Export & Printable Prep Sheet ---");
import { Exporter } from "../export.js";

test("EXPORT-01: Exporter.printCompetencyPrepSheet is defined and guards against empty input", () => {
  assert.strictEqual(typeof Exporter.printCompetencyPrepSheet, "function");
  // In Node environment where window is undefined or mockable
  global.alert = (msg) => {}; // Mock alert
  assert.doesNotThrow(() => {
    Exporter.printCompetencyPrepSheet(null);
    Exporter.printCompetencyPrepSheet({ questions: [] });
  });
});

console.log("\n================================================================================");
console.log(`  RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
console.log("================================================================================");

if (passed === total) {
  console.log("\n🎉 ALL MODULE 2 CV COMPETENCY INTERVIEWER TESTS PASSED WITH 100% RATE!\n");
  process.exit(0);
} else {
  console.error(`\n❌ ${total - passed} tests failed.`);
  process.exit(1);
}
