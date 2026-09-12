// scripts/test_schema_upload_guard.mjs
// Verification suite for Dataset Schema Upload Fallback & Generation Button Locking

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { parseDatasetSchema, state, updateGenerateButtonLockState } from "../app.js";
import { buildTestGenerationPrompt } from "../prompts.js";
import { Datasets } from "../datasets.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — SCHEMA UPLOAD FALLBACK & BUTTON LOCK VERIFICATION SUITE");
console.log("================================================================================\n");

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}\n     Error: ${err.message}`);
    process.exit(1);
  }
}

const htmlPath = path.resolve("index.html");
const cssPath = path.resolve("style.css");
const appJsPath = path.resolve("app.js");

const html = fs.readFileSync(htmlPath, "utf-8");
const css = fs.readFileSync(cssPath, "utf-8");
const appJs = fs.readFileSync(appJsPath, "utf-8");

// -----------------------------------------------------------------------------
// Group 1: HTML Markup Structure
// -----------------------------------------------------------------------------
console.log("--- Group 1: HTML Markup Structure ---");

await test("HTML-01: #dataset-schema-fallback-box exists with proper components", () => {
  assert.ok(html.includes('id="dataset-schema-fallback-box"'), "Missing #dataset-schema-fallback-box");
  assert.ok(html.includes('id="schema-fallback-dataset-name"'), "Missing #schema-fallback-dataset-name");
  assert.ok(html.includes('id="schema-fallback-badge"'), "Missing #schema-fallback-badge");
  assert.ok(html.includes('id="schema-dropzone"'), "Missing #schema-dropzone");
  assert.ok(html.includes('id="schema-file-input"'), "Missing #schema-file-input");
  assert.ok(html.includes('id="dropzone-prompt"'), "Missing #dropzone-prompt");
  assert.ok(html.includes('id="dropzone-success"'), "Missing #dropzone-success");
  assert.ok(html.includes('id="btn-clear-uploaded-csv"'), "Missing #btn-clear-uploaded-csv");
  assert.ok(html.includes('id="dropzone-columns-preview"'), "Missing #dropzone-columns-preview");
});

// -----------------------------------------------------------------------------
// Group 2: CSS Styling & Locked Button Rules
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: CSS Styling & Locked Button Rules ---");

await test("CSS-01: .schema-fallback-box and .schema-fallback-box.verified exist", () => {
  assert.ok(css.includes(".schema-fallback-box {"), "Missing .schema-fallback-box");
  assert.ok(css.includes(".schema-fallback-box.verified"), "Missing .schema-fallback-box.verified");
});

await test("CSS-02: .schema-dropzone and dragover state exist", () => {
  assert.ok(css.includes(".schema-dropzone {"), "Missing .schema-dropzone");
  assert.ok(css.includes(".schema-dropzone.dragover"), "Missing .schema-dropzone.dragover");
});

await test("CSS-03: .btn-primary.btn-locked and disabled state exists with cursor: not-allowed", () => {
  assert.ok(css.includes(".btn-primary.btn-locked") || css.includes(".btn-locked"), "Missing .btn-locked");
  assert.ok(css.includes("cursor: not-allowed"), "Missing cursor: not-allowed in locked/disabled button");
});

// -----------------------------------------------------------------------------
// Group 3: Real CSV Parsing (Using Indian Trade Dataset from Attachment 1)
// -----------------------------------------------------------------------------
console.log("\n--- Group 3: Real CSV Parsing (Attachment 1 Schema) ---");

await test("CSV-01: parseDatasetSchema parses actual 7 columns from user's India trade CSV", () => {
  const sampleCsv = `Country,Export,Import,Total Trade,Trade Balance,Financial Year(start),Financial Year(end)
AFGHANISTAN,21.25,10.7,31.95,10.55,1997,1998
AFGHANISTAN,12.81,28.14,40.95,-15.33,1998,1999
AFGHANISTAN,33.2,21.06,54.26,12.15,1999,2000
AFGHANISTAN,25.86,26.59,52.45,-0.73,2000,2001
AFGHANISTAN,24.37,17.52,41.89,6.85,2001,2002`;

  const parsed = parseDatasetSchema(sampleCsv, "Exports and Imports of India (1997-2022)");
  assert.strictEqual(parsed.columns.length, 7, "Should extract exactly 7 columns");

  const colNames = parsed.columns.map(c => c.name);
  assert.deepStrictEqual(colNames, [
    "Country",
    "Export",
    "Import",
    "Total Trade",
    "Trade Balance",
    "Financial Year(start)",
    "Financial Year(end)"
  ]);

  const countryCol = parsed.columns.find(c => c.name === "Country");
  assert.strictEqual(countryCol.type, "Text");
  assert.strictEqual(countryCol.sample, "AFGHANISTAN");

  const exportCol = parsed.columns.find(c => c.name === "Export");
  assert.strictEqual(exportCol.type, "Number / Currency");

  const balanceCol = parsed.columns.find(c => c.name === "Trade Balance");
  assert.strictEqual(balanceCol.type, "Number / Currency");
});

// -----------------------------------------------------------------------------
// Group 4: Kaggle Parser Behavior (Why Indian Trade Dataset returned 0 columns)
// -----------------------------------------------------------------------------
console.log("\n--- Group 4: Kaggle Parser Behavior ---");

await test("KAGGLE-01: parseKaggleAttributeColumns returns empty on descriptions without attribute blocks", () => {
  const indiaDesc = `Trade data of india with countries till June 2022\ndata is in million dollars`;
  const cols = Datasets.parseKaggleAttributeColumns(indiaDesc);
  assert.strictEqual(cols.length, 0, "Descriptions without column markdown should return 0 columns");
});

// -----------------------------------------------------------------------------
// Group 5: Button Locking & Logic in app.js
// -----------------------------------------------------------------------------
console.log("\n--- Group 5: Button Locking & Logic in app.js ---");

await test("LOGIC-01: app.js contains updateGenerateButtonLockState and handleCsvFileUpload", () => {
  assert.ok(appJs.includes("function updateGenerateButtonLockState"), "Missing updateGenerateButtonLockState in app.js");
  assert.ok(appJs.includes("function handleCsvFileUpload"), "Missing handleCsvFileUpload in app.js");
  assert.ok(appJs.includes("function setupSchemaUploadDropzone"), "Missing setupSchemaUploadDropzone in app.js");
});

await test("LOGIC-02: handleGenerateTest halts with an alert if columns are missing for real dataset", () => {
  assert.ok(appJs.includes("Schema Required: Column headers"), "Must check columns and halt generation if empty");
  assert.ok(appJs.includes("state.selectedDataset.syntheticCsv"), "Must pass uploaded CSV to syntheticCsv");
});

// -----------------------------------------------------------------------------
// Group 6: Prompt Construction with Verified CSV Snippet
// -----------------------------------------------------------------------------
console.log("\n--- Group 6: Prompt Column Fidelity & Strict Instructions ---");

await test("PROMPT-01: buildTestGenerationPrompt includes sample rows and strict instruction when syntheticCsv is provided", () => {
  const sampleCsv = `Country,Export,Import,Total Trade,Trade Balance,Financial Year(start),Financial Year(end)
AFGHANISTAN,21.25,10.7,31.95,10.55,1997,1998
AFGHANISTAN,12.81,28.14,40.95,-15.33,1998,1999`;

  const prompt = buildTestGenerationPrompt({
    difficulty: "intermediate",
    topics: ["Lookups", "Pivot Tables"],
    datasetMeta: {
      name: "Exports and Imports of India (1997-2022)",
      source: "Kaggle",
      rowCount: "5,500+",
      description: "Trade data of india with countries",
      columns: [
        { name: "Country", type: "Text", sample: "AFGHANISTAN" },
        { name: "Export", type: "Number / Currency", sample: "21.25" },
        { name: "Import", type: "Number / Currency", sample: "10.7" },
        { name: "Total Trade", type: "Number / Currency", sample: "31.95" },
        { name: "Trade Balance", type: "Number / Currency", sample: "10.55" },
        { name: "Financial Year(start)", type: "Number / Currency", sample: "1997" },
        { name: "Financial Year(end)", type: "Number / Currency", sample: "1998" }
      ],
      syntheticCsv: sampleCsv
    },
    taskCount: 12
  });

  assert.ok(prompt.includes("Sample Rows from User's Verified CSV:"), "Prompt must include sample CSV snippet");
  assert.ok(prompt.includes("Country,Export,Import,Total Trade"), "Prompt must include real column headers");
  assert.ok(prompt.includes("Do not invent, substitute, or rename columns"), "Prompt must strictly forbid inventing columns");
  assert.ok(!prompt.includes("Commodity"), "Prompt must not contain hallucinated Commodity column");
});

console.log("\n================================================================================");
console.log(`  🎉 ALL ${passed}/${passed} SCHEMA GUARD TESTS PASSED SUCCESSFULLY!`);
console.log("================================================================================\n");
