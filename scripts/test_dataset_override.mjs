// scripts/test_dataset_override.mjs
// Automated verification suite for On-Demand Dataset Upload & Schema Override

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("================================================================================");
console.log("  EXCELCOACH AI — ON-DEMAND DATASET UPLOAD & OVERRIDE VERIFICATION SUITE");
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
// Group 1: Static Code, CSS & DOM Markup Inspection
// -----------------------------------------------------------------------------
console.log("--- Group 1: CSS & HTML Markup Verification ---");

const htmlPath = path.resolve("index.html");
const cssPath = path.resolve("style.css");
const appJsPath = path.resolve("app.js");

const html = fs.readFileSync(htmlPath, "utf-8");
const css = fs.readFileSync(cssPath, "utf-8");
const appJs = fs.readFileSync(appJsPath, "utf-8");

test("HTML-01: index.html contains #dataset-schema-fallback-box and dropzone components", () => {
  assert.ok(html.includes('id="dataset-schema-fallback-box"'), "Missing #dataset-schema-fallback-box");
  assert.ok(html.includes('id="schema-fallback-dataset-name"'), "Missing #schema-fallback-dataset-name");
  assert.ok(html.includes('id="schema-fallback-icon"'), "Missing #schema-fallback-icon");
  assert.ok(html.includes('id="schema-fallback-badge"'), "Missing #schema-fallback-badge");
  assert.ok(html.includes('id="dropzone-prompt"'), "Missing #dropzone-prompt");
  assert.ok(html.includes('id="dropzone-success"'), "Missing #dropzone-success");
  assert.ok(html.includes('id="btn-clear-uploaded-csv"'), "Missing #btn-clear-uploaded-csv");
});

test("CSS-01: style.css defines .schema-fallback-box.ready and .schema-fallback-badge.ready", () => {
  assert.ok(css.includes(".schema-fallback-box.ready"), "Missing .schema-fallback-box.ready in style.css");
  assert.ok(css.includes(".schema-fallback-badge.ready"), "Missing .schema-fallback-badge.ready in style.css");
});

test("CODE-01: app.js handles ready state and apiBackup in handleCsvFileUpload & clearBtn", () => {
  assert.ok(appJs.includes("schema-fallback-box ready"), "Missing ready class assignment in app.js");
  assert.ok(appJs.includes("active.apiBackup"), "Missing apiBackup management in app.js");
  assert.ok(appJs.includes("✨ Ready • Optional Upload"), "Missing Ready badge label in app.js");
});

// -----------------------------------------------------------------------------
// Group 2: Mock DOM Simulator & Runtime State Tests
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: Runtime Mock DOM Simulator & State Transitions ---");

class MockElement {
  constructor(id, tag = "div") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classes = new Set();
    this.style = {};
    this.listeners = {};
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
    this.title = "";
  }
  get className() {
    return Array.from(this.classes).join(" ");
  }
  set className(val) {
    this.classes.clear();
    if (val) {
      val.split(/\s+/).filter(Boolean).forEach(c => this.classes.add(c));
    }
  }
  get classList() {
    return {
      add: (cls) => this.classes.add(cls),
      remove: (cls) => this.classes.delete(cls),
      contains: (cls) => this.classes.has(cls),
      toggle: (cls, force) => {
        if (force === undefined) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        } else if (force) {
          this.classes.add(cls);
        } else {
          this.classes.delete(cls);
        }
      }
    };
  }
  addEventListener(evt, handler) {
    this.listeners[evt] = this.listeners[evt] || [];
    this.listeners[evt].push(handler);
  }
  click() {
    (this.listeners["click"] || []).forEach(h => h({ stopPropagation: () => {} }));
  }
}

const mockElements = {
  "btn-generate-test": new MockElement("btn-generate-test", "button"),
  "dataset-schema-fallback-box": new MockElement("dataset-schema-fallback-box", "div"),
  "generation-status-text": new MockElement("generation-status-text", "span"),
  "schema-fallback-dataset-name": new MockElement("schema-fallback-dataset-name", "h4"),
  "schema-fallback-desc": new MockElement("schema-fallback-desc", "p"),
  "schema-fallback-icon": new MockElement("schema-fallback-icon", "span"),
  "schema-fallback-badge": new MockElement("schema-fallback-badge", "span"),
  "dropzone-prompt": new MockElement("dropzone-prompt", "div"),
  "dropzone-success": new MockElement("dropzone-success", "div"),
  "dropzone-file-name": new MockElement("dropzone-file-name", "strong"),
  "dropzone-col-count": new MockElement("dropzone-col-count", "span"),
  "dropzone-columns-preview": new MockElement("dropzone-columns-preview", "div"),
  "schema-dropzone": new MockElement("schema-dropzone", "div"),
  "schema-file-input": new MockElement("schema-file-input", "input"),
  "btn-browse-csv": new MockElement("btn-browse-csv", "button"),
  "btn-clear-uploaded-csv": new MockElement("btn-clear-uploaded-csv", "button")
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => null,
  querySelectorAll: () => []
};

// Import functions from app.js
const { state, updateGenerateButtonLockState, handleCsvFileUpload, setupSchemaUploadDropzone } = await import("../app.js");

// Initialize dropzone listeners
setupSchemaUploadDropzone();

test("STATE-01: Synthetic mode hides fallback box and unlocks generation", () => {
  state.datasetStrategy = "synthetic";
  state.selectedDataset = null;

  updateGenerateButtonLockState();

  assert.strictEqual(state.isGenerationLocked, false);
  assert.strictEqual(mockElements["btn-generate-test"].disabled, false);
  assert.strictEqual(mockElements["dataset-schema-fallback-box"].style.display, "none");
});

test("STATE-02: Real dataset with missing columns locks generation and shows warning state", () => {
  state.datasetStrategy = "find_real";
  state.selectedDataset = {
    id: "kaggle_india_trade_1",
    title: "Exports and Imports of India",
    source: "Kaggle",
    columns: [] // Missing columns
  };

  updateGenerateButtonLockState();

  assert.strictEqual(state.isGenerationLocked, true, "Generation must be locked");
  assert.strictEqual(mockElements["btn-generate-test"].disabled, true);
  assert.ok(mockElements["btn-generate-test"].classList.contains("btn-locked"));
  assert.strictEqual(mockElements["dataset-schema-fallback-box"].style.display, "block");
  assert.ok(!mockElements["dataset-schema-fallback-box"].classList.contains("ready"));
  assert.ok(!mockElements["dataset-schema-fallback-box"].classList.contains("verified"));
  assert.strictEqual(mockElements["schema-fallback-icon"].textContent, "⚠️");
  assert.strictEqual(mockElements["schema-fallback-badge"].textContent, "🔒 Generation Locked");
});

test("STATE-03: Real dataset with API columns remains unlocked and displays ready state for optional upload", () => {
  state.datasetStrategy = "find_real";
  state.selectedDataset = {
    id: "kaggle_retail_sales_2",
    title: "Global Retail Transactions",
    source: "Kaggle",
    rowCount: "10,000+ rows",
    columns: [
      { name: "TransactionID", type: "Text", sample: "TX_1001" },
      { name: "Revenue", type: "Number", sample: "250.00" },
      { name: "CustomerSegment", type: "Text", sample: "Enterprise" }
    ]
  };

  updateGenerateButtonLockState();

  assert.strictEqual(state.isGenerationLocked, false, "Generation must be UNLOCKED when API columns exist");
  assert.strictEqual(mockElements["btn-generate-test"].disabled, false);
  assert.ok(!mockElements["btn-generate-test"].classList.contains("btn-locked"));
  assert.strictEqual(mockElements["dataset-schema-fallback-box"].style.display, "block");
  assert.ok(mockElements["dataset-schema-fallback-box"].classList.contains("ready"), "Box must have .ready class");
  assert.strictEqual(mockElements["schema-fallback-icon"].textContent, "📊");
  assert.strictEqual(mockElements["schema-fallback-badge"].textContent, "✨ Ready • Optional Upload");
  assert.ok(mockElements["schema-fallback-badge"].classList.contains("ready"), "Badge must have .ready class");
  assert.strictEqual(mockElements["dropzone-prompt"].style.display, "flex");
  assert.strictEqual(mockElements["dropzone-success"].style.display, "none");
});

await asyncTest("STATE-04: Uploading local CSV overrides API columns, backs up original metadata, and sets verified state", async () => {
  const active = state.selectedDataset;
  assert.ok(active, "Active dataset must exist");

  // Mock a CSV File upload
  const rawCsv = `InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice,CustomerID,Country
536365,85123A,WHITE HANGING HEART T-LIGHT HOLDER,6,2010-12-01 08:26:00,2.55,17850,United Kingdom
536365,71053,WHITE METAL LANTERN,6,2010-12-01 08:26:00,3.39,17850,United Kingdom`;

  const fakeFile = {
    name: "online_retail_actual.csv",
    type: "text/csv",
    size: rawCsv.length,
    slice: () => fakeFile
  };

  // Mock global FileReader for Node environment
  global.FileReader = class {
    readAsText() {
      setTimeout(() => {
        this.onload({ target: { result: rawCsv } });
      }, 5);
    }
  };

  handleCsvFileUpload(fakeFile);

  await new Promise(resolve => setTimeout(resolve, 25));

  // 1. Verify original API metadata was backed up
  assert.ok(active.apiBackup, "apiBackup must be stored");
  assert.strictEqual(active.apiBackup.columns.length, 3, "apiBackup should contain original 3 columns");

  // 2. Verify dataset was overwritten with 8 columns from uploaded CSV
  assert.strictEqual(active.columns.length, 8, "Should have 8 columns from uploaded CSV");
  assert.strictEqual(active.columns[0].name, "InvoiceNo");
  assert.strictEqual(active.columns[5].name, "UnitPrice");
  assert.strictEqual(active.isUploaded, true);
  assert.strictEqual(active.fileName, "online_retail_actual.csv");

  // 3. Verify UI state updated to verified override
  assert.strictEqual(state.isGenerationLocked, false);
  assert.ok(mockElements["dataset-schema-fallback-box"].classList.contains("verified"));
  assert.strictEqual(mockElements["schema-fallback-icon"].textContent, "✅");
  assert.strictEqual(mockElements["schema-fallback-badge"].textContent, "✓ Overridden (8 cols)");
  assert.strictEqual(mockElements["dropzone-prompt"].style.display, "none");
  assert.strictEqual(mockElements["dropzone-success"].style.display, "block");
});

await asyncTest("STATE-05: Clicking 'Clear CSV' restores original API metadata and returns to ready state", async () => {
  const active = state.selectedDataset;
  assert.ok(active && active.isUploaded, "Dataset should be in uploaded state before clearing");

  // Candidate clicks "Clear CSV"
  mockElements["btn-clear-uploaded-csv"].click();

  await new Promise(resolve => setTimeout(resolve, 10));

  // 1. Verify restored to original 3 API columns
  assert.strictEqual(active.columns.length, 3, "Must restore original 3 API columns");
  assert.strictEqual(active.columns[0].name, "TransactionID");
  assert.strictEqual(active.columns[1].name, "Revenue");
  assert.strictEqual(active.isUploaded, false);
  assert.strictEqual(active.apiBackup, undefined, "apiBackup must be cleaned up");

  // 2. Verify UI smoothly returns to Case B ready state
  assert.strictEqual(state.isGenerationLocked, false, "Generation must remain unlocked");
  assert.ok(mockElements["dataset-schema-fallback-box"].classList.contains("ready"));
  assert.ok(!mockElements["dataset-schema-fallback-box"].classList.contains("verified"));
  assert.strictEqual(mockElements["schema-fallback-icon"].textContent, "📊");
  assert.strictEqual(mockElements["schema-fallback-badge"].textContent, "✨ Ready • Optional Upload");
  assert.strictEqual(mockElements["dropzone-prompt"].style.display, "flex");
  assert.strictEqual(mockElements["dropzone-success"].style.display, "none");
});

// -----------------------------------------------------------------------------
// Final Report
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`  VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("================================================================================\n");

if (passed === total) {
  console.log("🎉 ALL ON-DEMAND DATASET UPLOAD & OVERRIDE TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("⚠️ SOME TESTS FAILED. Please review the output above.");
  process.exit(1);
}
