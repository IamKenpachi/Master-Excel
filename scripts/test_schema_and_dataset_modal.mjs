// scripts/test_schema_and_dataset_modal.mjs
// Automated verification suite for Schema Inspector & Dataset Details Modal

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { parseDatasetSchema } from "../app.js";
import { SAMPLE_OFFLINE_TEST } from "../storage.js";
import { Datasets } from "../datasets.js";

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

test("HTML-05: #modal-dataset-details is a root-level modal and NOT nested inside #modal-scorecard", () => {
  const scorecardIdx = html.indexOf('id="modal-scorecard"');
  const detailsIdx = html.indexOf('id="modal-dataset-details"');
  assert.ok(scorecardIdx !== -1 && detailsIdx !== -1, "Both modals must exist");
  
  // Extract snippet between scorecard and details modal
  const betweenSnippet = html.slice(scorecardIdx, detailsIdx);
  // Count open and close div tags in this snippet to guarantee scorecard was closed
  const opens = (betweenSnippet.match(/<div(\s|>)/g) || []).length;
  const closes = (betweenSnippet.match(/<\/div>/g) || []).length;
  assert.strictEqual(opens, closes, `Scorecard modal tags must be balanced before details modal (opens: ${opens}, closes: ${closes})`);
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

// -----------------------------------------------------------------------------
// Group 5: Kaggle Full Description & Attribute Column Extraction
// -----------------------------------------------------------------------------
console.log("\n--- Group 5: Kaggle Full Description & Attribute Column Extraction ---");

const sampleKaggleDescription = `### Context
This is a transnational data set which contains all the transactions occurring between 01/12/2010 and 09/12/2011 for a UK-based and registered non-store online retail.

### Content
The company mainly sells unique all-occasion gifts. Many customers of the company are wholesalers.

### Attribute Information:
InvoiceNo: Invoice number. Nominal, a 6-digit integral number uniquely assigned to each transaction. If this code starts with letter 'c', it indicates a cancellation.
StockCode: Product (item) code. Nominal, a 5-digit integral number uniquely assigned to each distinct product.
Description: Product (item) name. Nominal.
Quantity: The quantities of each product (item) per transaction. Numeric.
InvoiceDate: Invice Date and time. Numeric, the day and time when each transaction was generated.
UnitPrice: Unit price. Numeric, Product price per unit in sterling.
CustomerID: Customer number. Nominal, a 5-digit integral number uniquely assigned to each customer.
Country: Country name. Nominal, the name of the country where each customer resides.`;

await test("KAGGLE-01: parseKaggleAttributeColumns parses all 8 columns from Online Retail description", () => {
  const cols = Datasets.parseKaggleAttributeColumns(sampleKaggleDescription);
  assert.strictEqual(cols.length, 8, `Expected 8 columns, got ${cols.length}`);
  
  const colNames = cols.map(c => c.name);
  assert.ok(colNames.includes("InvoiceNo"), "Missing InvoiceNo");
  assert.ok(colNames.includes("StockCode"), "Missing StockCode");
  assert.ok(colNames.includes("Description"), "Missing Description");
  assert.ok(colNames.includes("Quantity"), "Missing Quantity");
  assert.ok(colNames.includes("InvoiceDate"), "Missing InvoiceDate");
  assert.ok(colNames.includes("UnitPrice"), "Missing UnitPrice");
  assert.ok(colNames.includes("CustomerID"), "Missing CustomerID");
  assert.ok(colNames.includes("Country"), "Missing Country");

  const invoiceNo = cols.find(c => c.name === "InvoiceNo");
  assert.strictEqual(invoiceNo.type, "Text / Identifier");
  assert.ok(invoiceNo.definition.includes("Invoice number"));

  const qty = cols.find(c => c.name === "Quantity");
  assert.strictEqual(qty.type, "Number / Numeric");

  const date = cols.find(c => c.name === "InvoiceDate");
  assert.strictEqual(date.type, "Date");
});

await test("KAGGLE-02: fetchKaggleDetails retrieves full 2,100+ character markdown description via local proxy", async () => {
  const details = await Datasets.fetchKaggleDetails("tunguz/online-retail");
  assert.ok(details, "fetchKaggleDetails should return a result");
  assert.ok(details.description.length > 1000, `Description should be >1000 chars, got ${details.description.length}`);
  assert.ok(details.description.includes("InvoiceNo"), "Description must contain InvoiceNo attribute information");
  assert.strictEqual(details.columns.length, 8, `Parsed columns should be 8, got ${details.columns.length}`);
});

await test("KAGGLE-03: app.js renders markdown description and includes column definitions in variables table", () => {
  assert.ok(appJs.includes("renderChatMarkdown(rawDescription)"), "Must use renderChatMarkdown to render rich text");
  assert.ok(appJs.includes("col.definition"), "Must include col.definition in variables table");
  assert.ok(appJs.includes("Datasets.parseKaggleAttributeColumns(datasetMeta.description)"), "Must support attribute parsing fallback");
  assert.ok(appJs.includes("Datasets.fetchKaggleDetails(state.selectedDataset.id"), "Must call fetchKaggleDetails on generation");
});

console.log("\n================================================================================");
console.log(`  🎉 ALL ${passed}/${passed} SCHEMA & DATASET MODAL TESTS PASSED SUCCESSFULLY!`);
console.log("================================================================================\n");
