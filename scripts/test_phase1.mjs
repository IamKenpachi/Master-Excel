// scripts/test_phase1.mjs - Automated Verification Suite for Phase 1 Active Test Upgrades

import assert from "node:assert";
import { lintExcelFormula, parseDatasetSchema, getTaskHintTiers } from "../app.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — PHASE 1 AUTOMATED VERIFICATION SUITE");
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
// 1. Live Excel Formula Linter Verification
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
  const res = lintExcelFormula("=VLOOKUP(A2, Products!A:D, 3)");
  assert.strictEqual(res.status, "warning");
  assert.strictEqual(res.badge, "INTERVIEW PITFALL");
  assert.match(res.message, /Missing exact-match flag in VLOOKUP/);
});

test("Linter: Validates VLOOKUP with exact match 0/FALSE", () => {
  const res = lintExcelFormula("=VLOOKUP(A2, Products, 3, FALSE)");
  assert.strictEqual(res.status, "valid");
});

test("Linter: Catches XLOOKUP with insufficient arguments (<3)", () => {
  const res = lintExcelFormula("=XLOOKUP(A2, B:B)");
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
// 2. CSV Dataset Schema Inspector Parser Verification
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

  const nil = parseDatasetSchema(null);
  assert.strictEqual(nil.rowCount, 0);
  assert.strictEqual(nil.columns.length, 0);
});

// -----------------------------------------------------------------------------
// 3. 3-Tier Progressive Hint Generator Verification
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
// 4. HTTP Server Endpoints & Static Asset Integrity Verification
// -----------------------------------------------------------------------------
console.log("\n--- 4. HTTP Server & UI Elements Test Suite ---");

test("Server: Serves index.html with all required Phase 1 UI controls", async () => {
  const res = await fetch("http://localhost:3000/");
  assert.strictEqual(res.status, 200, "Server returned 200 OK");
  const html = await res.text();

  assert.ok(html.includes('id="formula-bar-input"'), "index.html has #formula-bar-input");
  assert.ok(html.includes('id="formula-cell-name"'), "index.html has #formula-cell-name");
  assert.ok(html.includes('id="formula-linter-feedback"'), "index.html has #formula-linter-feedback");
  assert.ok(html.includes('id="btn-toggle-schema"'), "index.html has #btn-toggle-schema");
  assert.ok(html.includes('id="schema-inspector-drawer"'), "index.html has #schema-inspector-drawer");
  assert.ok(html.includes('id="btn-toggle-strict"'), "index.html has #btn-toggle-strict");
  assert.ok(html.includes('id="btn-shortcuts-help"'), "index.html has #btn-shortcuts-help");
  assert.ok(html.includes('id="modal-shortcuts"'), "index.html has #modal-shortcuts");
});

console.log("\n================================================================================");
console.log(`  RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
console.log("================================================================================\n");

if (passed === total) {
  console.log("🎉 ALL PHASE 1 REQUIREMENTS VERIFIED SUCCESSFULLY WITH 100% CODE PASS RATE!");
  process.exit(0);
} else {
  console.error("❌ Some tests failed. Inspect errors above.");
  process.exit(1);
}
