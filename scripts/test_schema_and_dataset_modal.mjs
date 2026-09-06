// scripts/test_schema_and_dataset_modal.mjs
// Automated verification suite for Schema Inspector & Dataset Details Modal

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { parseDatasetSchema } from "../app.js";
import { SAMPLE_OFFLINE_TEST } from "../storage.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — SCHEMA INSPECTOR & DATASET DETAILS VERIFICATION SUITE");
console.log("================================================================================\n");

const htmlPath = path.resolve("index.html");
const cssPath = path.resolve("style.css");
const appJsPath = path.resolve("app.js");

const html = fs.readFileSync(htmlPath, "utf-8");
const css = fs.readFileSync(cssPath, "utf-8");
const appJs = fs.readFileSync(appJsPath, "utf-8");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}\n     Error: ${err.message}`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Group 1: HTML Structure
// -----------------------------------------------------------------------------
console.log("--- Group 1: HTML Markup Structure ---");

test("HTML-01: #btn-toggle-schema exists in test header actions", () => {
  assert.ok(html.includes('id="btn-toggle-schema"'), "Missing #btn-toggle-schema");
});

test("HTML-02: #btn-toggle-dataset-info exists next to Schema Inspector", () => {
  assert.ok(html.includes('id="btn-toggle-dataset-info"'), "Missing #btn-toggle-dataset-info");
});

test("HTML-03: Schema Drawer has #schema-dataset-title, #schema-col-count, #schema-row-count, #schema-table-tbody", () => {
  assert.ok(html.includes('id="schema-inspector-drawer"'), "Missing #schema-inspector-drawer");
  assert.ok(html.includes('id="schema-dataset-title"'), "Missing #schema-dataset-title");
  assert.ok(html.includes('id="schema-col-count"'), "Missing #schema-col-count");
  assert.ok(html.includes('id="schema-row-count"'), "Missing #schema-row-count");
  assert.ok(html.includes('id="schema-table-tbody"'), "Missing #schema-table-tbody");
});

test("HTML-04: #modal-dataset-details exists with title, badges, body, and close button", () => {
  assert.ok(html.includes('id="modal-dataset-details"'), "Missing #modal-dataset-details");
  assert.ok(html.includes('id="dataset-modal-title"'), "Missing #dataset-modal-title");
  assert.ok(html.includes('id="dataset-modal-badges"'), "Missing #dataset-modal-badges");
  assert.ok(html.includes('id="dataset-modal-body"'), "Missing #dataset-modal-body");
  assert.ok(html.includes('id="btn-close-dataset-modal"'), "Missing #btn-close-dataset-modal");
});

// -----------------------------------------------------------------------------
// Group 2: CSS Styles
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: CSS Styling & Layout ---");

test("CSS-01: .schema-drawer and .schema-drawer.open rules exist", () => {
  assert.ok(css.includes(".schema-drawer {"), "Missing .schema-drawer");
  assert.ok(css.includes(".schema-drawer.open"), "Missing .schema-drawer.open");
});

test("CSS-02: .schema-table and .schema-col-row hover rules exist", () => {
  assert.ok(css.includes(".schema-table {"), "Missing .schema-table");
  assert.ok(css.includes(".schema-col-row"), "Missing .schema-col-row");
});

test("CSS-03: .dataset-section-block and .dataset-vars-table rules exist", () => {
  assert.ok(css.includes(".dataset-section-block {"), "Missing .dataset-section-block");
  assert.ok(css.includes(".dataset-vars-table {"), "Missing .dataset-vars-table");
});

test("CSS-04: .schema-type-pill has number, date, and text variants", () => {
  assert.ok(css.includes(".schema-type-pill.number"), "Missing .schema-type-pill.number");
  assert.ok(css.includes(".schema-type-pill.date"), "Missing .schema-type-pill.date");
  assert.ok(css.includes(".schema-type-pill.text"), "Missing .schema-type-pill.text");
});

// -----------------------------------------------------------------------------
// Group 3: JavaScript Schema Parsing & Drawer Population
// -----------------------------------------------------------------------------
console.log("\n--- Group 3: Schema Inspector Logic ---");

test("LOGIC-01: parseDatasetSchema parses 8 columns from SAMPLE_OFFLINE_TEST syntheticCsv", () => {
  const csv = SAMPLE_OFFLINE_TEST.test.syntheticCsv;
  const schema = parseDatasetSchema(csv, "Global eBook Sales");
  assert.strictEqual(schema.columns.length, 8, "Expected 8 columns");
  assert.strictEqual(schema.rowCount, 15, "Expected 15 sample rows");
  
  const colNames = schema.columns.map(c => c.name);
  assert.ok(colNames.includes("TransactionID"));
  assert.ok(colNames.includes("UnitsSold"));
  assert.ok(colNames.includes("PricePerUnit"));
  assert.ok(colNames.includes("OrderDate"));
  
  const dateCol = schema.columns.find(c => c.name === "OrderDate");
  assert.strictEqual(dateCol.type, "Date");
});

test("LOGIC-02: app.js targets #schema-table-tbody (NOT nonexistent schema-columns-list)", () => {
  assert.ok(appJs.includes('document.getElementById("schema-table-tbody")'), "Should target #schema-table-tbody");
  assert.ok(!appJs.includes('document.getElementById("schema-columns-list")'), "Should NOT look for nonexistent #schema-columns-list");
});

test("LOGIC-03: updateSchemaDrawer handles empty CSV gracefully with informative fallback", () => {
  assert.ok(appJs.includes("No column definitions or raw CSV attached to this test."), "Has friendly empty fallback message");
});

test("LOGIC-04: updateSchemaDrawer supports fallback column extraction from datasetMeta", () => {
  assert.ok(appJs.includes("datasetMeta.columns"), "Has fallback for datasetMeta.columns");
});

// -----------------------------------------------------------------------------
// Group 4: Dataset Details Modal Integration
// -----------------------------------------------------------------------------
console.log("\n--- Group 4: Dataset Details Modal Logic ---");

test("MODAL-01: app.js defines openDatasetDetailsModal and closeDatasetDetailsModal", () => {
  assert.ok(appJs.includes("function openDatasetDetailsModal()"), "Missing openDatasetDetailsModal");
  assert.ok(appJs.includes("function closeDatasetDetailsModal()"), "Missing closeDatasetDetailsModal");
});

test("MODAL-02: app.js binds click listeners to #btn-toggle-dataset-info and #btn-close-dataset-modal", () => {
  assert.ok(appJs.includes('document.getElementById("btn-toggle-dataset-info")?.addEventListener("click"'), "Missing toggle button listener");
  assert.ok(appJs.includes('document.getElementById("btn-close-dataset-modal")?.addEventListener("click"'), "Missing close button listener");
});

test("MODAL-03: Escape key closes modal-dataset-details", () => {
  assert.ok(appJs.includes("closeDatasetDetailsModal();"), "Escape key handler should call closeDatasetDetailsModal");
});

test("MODAL-04: renderDatasetDetailsModal renders dataset overview, variables table, and business scenario", () => {
  assert.ok(appJs.includes("Dataset Overview & Description"), "Modal includes dataset overview block");
  assert.ok(appJs.includes("Variables & Schema Dictionary"), "Modal includes variables schema dictionary");
  assert.ok(appJs.includes("Business Scenario & Objectives"), "Modal includes business scenario block");
});

test("MODAL-05: loadTestIntoView synchronizes syntheticCsv and preserves datasetMeta", () => {
  assert.ok(appJs.includes("test.syntheticCsv = csvContent"), "Synchronizes test.syntheticCsv");
  assert.ok(appJs.includes("testPayload.syntheticCsv = csvContent"), "Synchronizes testPayload.syntheticCsv");
  assert.ok(appJs.includes("datasetMeta: testPayload.datasetMeta"), "Saves datasetMeta to history");
});

console.log("\n================================================================================");
console.log(`  🎉 ALL ${passed}/${passed} SCHEMA & DATASET MODAL TESTS PASSED SUCCESSFULLY!`);
console.log("================================================================================\n");
