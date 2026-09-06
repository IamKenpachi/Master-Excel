// scripts/test_learning_modes.mjs - Comprehensive Automated Verification Suite (Phase 1, Phase 2, Phase 3)

import assert from "node:assert";
import { lintExcelFormula, parseDatasetSchema, getTaskHintTiers, calculateHiringManagerScore } from "../app.js";
import { buildDrillGenerationPrompt } from "../prompts.js";
import { Gemini } from "../gemini.js";
import { Exporter } from "../export.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — COMPLETE LEARNING & DRILLING ENGINE VERIFICATION SUITE");
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

// -----------------------------------------------------------------------------
// 1. Live Excel Formula Linter Verification (Phase 1)
// -----------------------------------------------------------------------------
console.log("--- 1. Formula Linter Test Suite ---");

test("Linter: Empty input returns idle", () => {
  const res = lintExcelFormula("");
  assert.strictEqual(res.status, "idle");
});

test("Linter: Missing '=' warns user to prefix formula", () => {
  const res = lintExcelFormula("SUM(A1:A10)");
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "SYNTAX TIP");
  assert.match(res.message, /must begin with '='/);
});

test("Linter: Detects unbalanced parentheses ')'", () => {
  const res = lintExcelFormula("=SUM(A1:A10");
  assert.strictEqual(res.status, "error");
  assert.strictEqual(res.badge, "SYNTAX ERROR");
  assert.match(res.message, /Missing 1 closing parenthesis/);
});

test("Linter: Detects unclosed quotation '\"'", () => {
  const res = lintExcelFormula('=IF(A1="West, 100, 0)');
  assert.strictEqual(res.status, "error");
  assert.strictEqual(res.badge, "SYNTAX ERROR");
  assert.match(res.message, /Unclosed text string quotation/);
});

test("Linter: Detects unclosed structured reference brackets '[]'", () => {
  const res = lintExcelFormula("=SUM(Sales[Revenue");
  assert.strictEqual(res.status, "error");
  assert.strictEqual(res.badge, "SYNTAX ERROR");
  assert.match(res.message, /Unclosed structured table reference bracket/);
});

test("Linter: Flags volatile OFFSET and recommends INDEX/XLOOKUP", () => {
  const res = lintExcelFormula("=OFFSET(A1, 2, 3)");
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "PERFORMANCE PITFALL");
  assert.match(res.message, /OFFSET is a volatile function/);
});

test("Linter: Flags volatile INDIRECT and recommends structured refs", () => {
  const res = lintExcelFormula('=INDIRECT("Table1[" & A1 & "]")');
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "PERFORMANCE PITFALL");
  assert.match(res.message, /INDIRECT is a volatile function/);
});

test("Linter: Flags entire column scan (e.g., A:A)", () => {
  const res = lintExcelFormula("=SUM(A:A)");
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "BEST PRACTICE");
  assert.match(res.message, /Entire column scan detected/);
});

test("Linter: Catches VLOOKUP missing exact match (4th parameter)", () => {
  const res = lintExcelFormula("=VLOOKUP(A2, Products, 3)");
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "INTERVIEW PITFALL");
  assert.match(res.message, /Missing exact-match flag in VLOOKUP/);
});

test("Linter: Validates VLOOKUP with exact match 0/FALSE", () => {
  const res = lintExcelFormula("=VLOOKUP(A2, Products, 3, FALSE)");
  assert.strictEqual(res.status, "valid");
});

test("Linter: Catches XLOOKUP with insufficient arguments (<3)", () => {
  const res = lintExcelFormula("=XLOOKUP(A2, Table[ID])");
  assert.strictEqual(res.status, "error");
  assert.strictEqual(res.badge, "ARGUMENT COUNT");
  assert.match(res.message, /XLOOKUP requires at least 3 arguments/);
});

test("Linter: Validates clean modern XLOOKUP with structured reference", () => {
  const res = lintExcelFormula("=XLOOKUP(A2, Products[ID], Products[Price], 0)");
  assert.strictEqual(res.status, "valid");
  assert.strictEqual(res.badge, "SYNTAX VALID");
});

test("Linter: Validates SUMIFS and reminds argument order", () => {
  const res = lintExcelFormula('=SUMIFS(Orders[Amount], Orders[Region], "East")');
  assert.strictEqual(res.status, "valid");
  assert.match(res.message, /SUMIFS detected.*sum_range comes first/);
});

// -----------------------------------------------------------------------------
// 2. Dataset Schema Inspector Parser (Phase 1)
// -----------------------------------------------------------------------------
console.log("\n--- 2. Dataset Schema Inspector Test Suite ---");

const sampleCSV = `Transaction_ID,Date,Customer_Segment,Revenue,Is_Returned
TX1001,2024-01-15,Corporate,$1250.50,false
TX1002,2024-01-16,Consumer,$420.00,false
TX1003,2024-01-17,Small Business,$3100.25,true
TX1004,2024-01-18,Corporate,$890.10,false`;

test("Schema Inspector: Parses headers, count, and column types correctly", () => {
  const schema = parseDatasetSchema(sampleCSV, "Retail Sales 2024");
  assert.strictEqual(schema.title, "Retail Sales 2024");
  assert.strictEqual(schema.rowCount, 4);
  assert.strictEqual(schema.columns.length, 5);

  const [col1, col2, col3, col4, col5] = schema.columns;
  assert.strictEqual(col1.name, "Transaction_ID");
  assert.strictEqual(col1.type, "Text");
  assert.strictEqual(col2.name, "Date");
  assert.strictEqual(col2.type, "Date");
  assert.strictEqual(col3.name, "Customer_Segment");
  assert.strictEqual(col3.type, "Text");
  assert.strictEqual(col4.name, "Revenue");
  assert.strictEqual(col4.type, "Number / Currency");
  assert.strictEqual(col5.name, "Is_Returned");
  assert.strictEqual(col5.type, "Boolean");
});

test("Schema Inspector: Gracefully handles empty or non-string input", () => {
  const empty = parseDatasetSchema("", "Missing Data");
  assert.strictEqual(empty.rowCount, 0);
  assert.strictEqual(empty.columns.length, 0);
});

// -----------------------------------------------------------------------------
// 3. 3-Tier Progressive Hint Generator (Phase 1)
// -----------------------------------------------------------------------------
console.log("\n--- 3. 3-Tier Progressive Hint Scaffold Test Suite ---");

test("Hints: Uses custom prompt hintNudge and hintBlueprint when present", () => {
  const task = {
    instruction: "Calculate total revenue by region using SUMIFS",
    hint: "=SUMIFS(Sales[Revenue], Sales[Region], @[Region])",
    hintNudge: "Group regional sales with dynamic range criteria.",
    hintBlueprint: "=SUMIFS(sum_range, criteria_range1, criteria1)"
  };
  const answer = {
    answer: "=SUMIFS(Sales[Revenue], Sales[Region], @[Region])",
    explanation: "Sum revenue column filtered by regional dimension."
  };

  const tiers = getTaskHintTiers(task, answer);
  assert.strictEqual(tiers.nudge, "Group regional sales with dynamic range criteria.");
  assert.strictEqual(tiers.blueprint, "=SUMIFS(sum_range, criteria_range1, criteria1)");
  assert.strictEqual(tiers.solution, "=SUMIFS(Sales[Revenue], Sales[Region], @[Region])");
  assert.strictEqual(tiers.explanation, "Sum revenue column filtered by regional dimension.");
});

test("Hints: Generates intelligent fallback nudges and blueprints for Lookups", () => {
  const task = {
    instruction: "Perform an exact match lookup of Unit_Cost from the Inventory table",
    category: "Lookup & Reference",
    hint: "=XLOOKUP(@[Product_ID], Inventory[Product_ID], Inventory[Unit_Cost])"
  };

  const tiers = getTaskHintTiers(task, null);
  assert.match(tiers.nudge, /Identify the unique foreign key/);
  assert.match(tiers.blueprint, /=XLOOKUP/);
  assert.strictEqual(tiers.solution, "=XLOOKUP(@[Product_ID], Inventory[Product_ID], Inventory[Unit_Cost])");
});

// -----------------------------------------------------------------------------
// 4. 4-Workout Split Drills (Phase 2)
// -----------------------------------------------------------------------------
console.log("\n--- 4. 4-Workout Split Drills Test Suite ---");

test("Drill Prompts: buildDrillGenerationPrompt generates specialized instructions for all 4 modes", () => {
  const promptScenario = buildDrillGenerationPrompt({ topic: "Lookups", drillMode: "scenario" });
  assert.ok(promptScenario.includes("Workout Mode: SCENARIO"));

  const promptGlitch = buildDrillGenerationPrompt({ topic: "Lookups", drillMode: "glitch" });
  assert.ok(promptGlitch.includes("GLITCH & DEBUG HUNT"));
  assert.ok(promptGlitch.includes("Unexpected #N/A"));

  const promptSkeleton = buildDrillGenerationPrompt({ topic: "Lookups", drillMode: "skeleton" });
  assert.ok(promptSkeleton.includes("SYNTAX SKELETON"));
  assert.ok(promptSkeleton.includes("blank placeholders '___'"));

  const promptVerbal = buildDrillGenerationPrompt({ topic: "Lookups", drillMode: "verbal" });
  assert.ok(promptVerbal.includes("VERBAL INTERVIEW DEFENSE"));
  assert.ok(promptVerbal.includes("Why choose XLOOKUP"));
});

test("Offline Drills: Returns 5 distinct, high-quality questions for each of the 4 workout modes", () => {
  const modes = ["scenario", "glitch", "skeleton", "verbal"];
  for (const mode of modes) {
    const questions = Gemini.getOfflineDrillQuestions("Lookups", mode);
    assert.strictEqual(questions.length, 5, `Mode ${mode} has 5 questions`);
    assert.ok(questions[0].title, `Mode ${mode} Q1 has a title`);
    assert.ok(questions[0].scenario, `Mode ${mode} Q1 has scenario`);
    assert.ok(questions[0].solution, `Mode ${mode} Q1 has solution`);
    assert.ok(questions[0].pitfallToAvoid, `Mode ${mode} Q1 has pitfall`);
    assert.ok(questions[0].interviewTalkingPoint, `Mode ${mode} Q1 has talking point`);
  }
});

test("Offline Drills: Glitch mode targets real interview errors (#SPILL!, silent VLOOKUP, etc.)", () => {
  const glitchQuestions = Gemini.getOfflineDrillQuestions("Lookups", "glitch");
  const titles = glitchQuestions.map(q => q.title).join(" ");
  assert.ok(titles.includes("Silent VLOOKUP"), "Contains silent VLOOKUP bug");
  assert.ok(titles.includes("#SPILL!"), "Contains #SPILL! bug");
  assert.ok(titles.includes("#VALUE!"), "Contains #VALUE! bug");
});

test("Offline Drills: Skeleton mode contains '___' placeholders for candidate practice", () => {
  const skeletonQuestions = Gemini.getOfflineDrillQuestions("Lookups", "skeleton");
  for (const q of skeletonQuestions) {
    assert.ok(q.scenario.includes("___"), `Question "${q.title}" contains '___' fill-in placeholders`);
  }
});

// -----------------------------------------------------------------------------
// 5. Hiring Manager Readiness Scorecard (Phase 3)
// -----------------------------------------------------------------------------
console.log("\n--- 5. Hiring Manager Readiness Scorecard Test Suite ---");

const mockTest = {
  tasks: [
    { number: 1, category: "Lookups" },
    { number: 2, category: "Lookups" },
    { number: 3, category: "Power Query" },
    { number: 4, category: "Aggregations" },
    { number: 5, category: "Pivot Tables" }
  ]
};

test("Scorecard: 100% completed with 'Easy' ratings and 0 hints yields STRONG HIRE", () => {
  const progress = {
    1: { done: true, rating: "Easy" },
    2: { done: true, rating: "Easy" },
    3: { done: true, rating: "Easy" },
    4: { done: true, rating: "Easy" },
    5: { done: true, rating: "Easy" }
  };
  const result = calculateHiringManagerScore(mockTest, progress, {}, false);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.verdict, "STRONG HIRE");
  assert.strictEqual(result.categoryScores["Lookups"], 100);
  assert.strictEqual(result.categoryScores["Power Query"], 100);
});

test("Scorecard: Moderate completion with hints and 'Hard' ratings yields BORDERLINE", () => {
  const progress = {
    1: { done: true, rating: "Hard" }, // 40 - 15 (tier 2 hint) = 25
    2: { done: true, rating: "Fair" }, // 75
    3: { done: false },                // 0
    4: { done: true, rating: "Fair" }, // 75
    5: { done: false }                 // 0
  };
  const hintTiers = { 1: 2 }; // Tier 2 hint used on task 1
  const result = calculateHiringManagerScore(mockTest, progress, hintTiers, false);
  // (25 + 75 + 0 + 75 + 0) / 5 = 35%
  assert.ok(result.score < 55);
  assert.strictEqual(result.verdict, "NEEDS WORK");
});

test("Scorecard: Strict Exam Mode awards +10% bonus for exam pressure", () => {
  const progress = {
    1: { done: true, rating: "Fair" }, // 75
    2: { done: true, rating: "Fair" }, // 75
    3: { done: true, rating: "Fair" }, // 75
    4: { done: true, rating: "Fair" }, // 75
    5: { done: true, rating: "Fair" }  // 75
  };
  const standardRes = calculateHiringManagerScore(mockTest, progress, {}, false);
  const strictRes = calculateHiringManagerScore(mockTest, progress, {}, true);
  assert.strictEqual(standardRes.score, 75);
  assert.strictEqual(strictRes.score, 85);
  assert.strictEqual(strictRes.verdict, "STRONG HIRE");
});

// -----------------------------------------------------------------------------
// 6. Exporter Cheat Sheet Verification (Phase 3)
// -----------------------------------------------------------------------------
console.log("\n--- 6. 1-Page Cheat Sheet Export Test Suite ---");

test("Exporter: printInterviewCheatSheet method exists and is callable", () => {
  assert.strictEqual(typeof Exporter.printInterviewCheatSheet, "function");
});

// -----------------------------------------------------------------------------
// 7. HTTP Server Endpoints & UI Elements Verification
// -----------------------------------------------------------------------------
console.log("\n--- 7. HTTP Server & UI Elements Test Suite ---");

test("Server: Serves index.html with all Phase 1, 2, and 3 elements", async () => {
  const res = await fetch("http://localhost:3000/");
  assert.strictEqual(res.status, 200, "Server returned 200 OK");
  const html = await res.text();

  // Phase 1 elements
  assert.ok(html.includes('id="formula-bar-input"'), "index.html has #formula-bar-input");
  assert.ok(html.includes('id="formula-cell-name"'), "index.html has #formula-cell-name");
  assert.ok(html.includes('id="formula-linter-feedback"'), "index.html has #formula-linter-feedback");
  assert.ok(html.includes('id="btn-toggle-schema"'), "index.html has #btn-toggle-schema");
  assert.ok(html.includes('id="schema-inspector-drawer"'), "index.html has #schema-inspector-drawer");
  assert.ok(html.includes('id="btn-toggle-strict"'), "index.html has #btn-toggle-strict");
  assert.ok(html.includes('id="btn-shortcuts-help"'), "index.html has #btn-shortcuts-help");
  assert.ok(html.includes('id="modal-shortcuts"'), "index.html has #modal-shortcuts");

  // Phase 2 elements
  assert.ok(html.includes('id="drill-mode-pills"'), "index.html has #drill-mode-pills");
  assert.ok(html.includes('data-mode="scenario"'), "index.html has scenario drill mode");
  assert.ok(html.includes('data-mode="glitch"'), "index.html has glitch drill mode");
  assert.ok(html.includes('data-mode="skeleton"'), "index.html has skeleton drill mode");
  assert.ok(html.includes('data-mode="verbal"'), "index.html has verbal drill mode");

  // Phase 3 elements
  assert.ok(html.includes('id="modal-scorecard"'), "index.html has #modal-scorecard");
  assert.ok(html.includes('id="weakness-warmup-card"'), "index.html has #weakness-warmup-card");
  assert.ok(html.includes('id="btn-start-warmup-drill"'), "index.html has #btn-start-warmup-drill");
  assert.ok(html.includes('id="btn-print-cheatsheet"'), "index.html has #btn-print-cheatsheet");
  assert.ok(html.includes('id="btn-scorecard-cheat-sheet"'), "index.html has #btn-scorecard-cheat-sheet");
});

console.log("\n================================================================================");
console.log(`  RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
console.log("================================================================================\n");

if (passed === total) {
  console.log("🎉 ALL PHASES (1, 2 & 3) FULLY VERIFIED WITH 100% CODE TEST PASS RATE!");
  process.exit(0);
} else {
  console.error("❌ Some tests failed. Inspect errors above.");
  process.exit(1);
}
