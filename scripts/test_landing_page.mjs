// scripts/test_landing_page.mjs
// Automated verification suite for the 2-Card Portal Landing Page (Welcome Hub)

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("  EXCELCOACH AI — 2-CARD PORTAL LANDING PAGE AUTOMATED VERIFICATION SUITE");
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
    const msg = err.message && err.message.length > 120 ? err.message.slice(0, 120) + "..." : (err.message || err);
    console.error(`     Error: ${msg}`);
  }
}

// -----------------------------------------------------------------------------
// Group 1: HTML Markup Structure (index.html)
// -----------------------------------------------------------------------------
console.log("--- Group 1: HTML Document Structure & Elements ---");
const htmlPath = path.resolve(process.cwd(), "index.html");
const html = fs.readFileSync(htmlPath, "utf-8");

test("index.html contains #screen-landing with class 'screen active'", () => {
  assert.match(html, /<section[^>]*id=["']screen-landing["'][^>]*class=["'][^"']*screen[^"']*active[^"']*["']/);
});

test("#screen-landing is placed as the first screen section in the main view", () => {
  const landingIdx = html.indexOf('id="screen-landing"');
  const generatorIdx = html.indexOf('id="screen-generator"');
  assert.ok(landingIdx > -1, "screen-landing must exist in index.html");
  assert.ok(generatorIdx > -1, "screen-generator must exist in index.html");
  assert.ok(landingIdx < generatorIdx, "screen-landing must precede screen-generator");
});

test("#screen-landing contains the welcome hero header and badge", () => {
  assert.match(html, /class=["'][^"']*landing-hero-container[^"']*["']/);
  assert.match(html, /class=["'][^"']*landing-hero-badge[^"']*["']/);
  assert.match(html, /360° Data Analyst Interview Preparation Platform/i);
  assert.match(html, /Master the Complete Data Analyst Interview/i);
});

test("portal cards grid contains both Excel (#portal-card-excel) and Competency (#portal-card-competency) cards", () => {
  assert.match(html, /class=["'][^"']*portal-cards-grid[^"']*["']/);
  assert.match(html, /id=["']portal-card-excel["']/);
  assert.match(html, /id=["']portal-card-competency["']/);
});

test("#portal-card-excel contains badge, title, feature list, and launch CTA #btn-launch-excel", () => {
  assert.match(html, /<div[^>]*class=["'][^"']*portal-card[^"']*excel[^"']*["'][^>]*id=["']portal-card-excel["']/);
  assert.match(html, /Excel Technical Simulator/i);
  assert.match(html, /id=["']btn-launch-excel["']/);
  assert.match(html, /Live Formula Bar & Linter/i);
  assert.match(html, /Hiring Manager Scorecard/i);
});

test("#portal-card-competency contains badge, title, feature list, and launch CTA #btn-launch-competency", () => {
  assert.match(html, /<div[^>]*class=["'][^"']*portal-card[^"']*competency[^"']*["'][^>]*id=["']portal-card-competency["']/);
  assert.match(html, /CV Competency Interviewer/i);
  assert.match(html, /id=["']btn-launch-competency["']/);
  assert.match(html, /CV Bullet Interrogation/i);
  assert.match(html, /6 Core Competency Pillars/i);
  assert.match(html, /AI Recruiter Evaluation/i);
});

test("#nav-links-excel has display: none initially on the landing hub", () => {
  assert.match(html, /id=["']nav-links-excel["'][^>]*style=["'][^"']*display:\s*none;?[^"']*["']/);
});

test("module buttons in #module-switcher start neutral (no active class)", () => {
  const excelBtnTag = html.match(/<button[^>]*id=["']btn-module-excel["'][^>]*>/);
  const compBtnTag = html.match(/<button[^>]*id=["']btn-module-competency["'][^>]*>/);
  assert.ok(excelBtnTag, "btn-module-excel tag must exist");
  assert.ok(compBtnTag, "btn-module-competency tag must exist");
  assert.ok(!excelBtnTag[0].includes("active"), "btn-module-excel should not have active class on landing hub");
  assert.ok(!compBtnTag[0].includes("active"), "btn-module-competency should not have active class on landing hub");
});

test("secondary screens (#screen-generator, #screen-competency) do NOT have the 'active' class by default", () => {
  assert.match(html, /<section[^>]*id=["']screen-generator["'][^>]*class=["']screen["']/);
  assert.match(html, /<section[^>]*id=["']screen-competency["'][^>]*class=["']screen["']/);
});

// -----------------------------------------------------------------------------
// Group 2: CSS Stylesheet (style.css)
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: CSS Stylesheet & Portal Card Aesthetics ---");
const cssPath = path.resolve(process.cwd(), "style.css");
const css = fs.readFileSync(cssPath, "utf-8");

test("style.css contains .landing-hero-container, .landing-hero-badge, .landing-hero-title styles", () => {
  assert.match(css, /\.landing-hero-container\s*\{/);
  assert.match(css, /\.landing-hero-badge\s*\{/);
  assert.match(css, /\.landing-hero-title\s*\{/);
});

test("style.css contains .portal-cards-grid with CSS Grid display and gap", () => {
  assert.match(css, /\.portal-cards-grid\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.portal-cards-grid\s*\{[^}]*grid-template-columns/);
});

test("style.css defines .portal-card with glassmorphic styling and hover transforms", () => {
  assert.match(css, /\.portal-card\s*\{[^}]*transition:/);
  assert.match(css, /\.portal-card:hover\s*\{[^}]*transform:/);
});

test("style.css defines distinct glow accents for .portal-card.excel and .portal-card.competency", () => {
  assert.match(css, /\.portal-card\.excel/);
  assert.match(css, /\.portal-card\.competency/);
  assert.match(css, /\.portal-card\.excel:hover/);
  assert.match(css, /\.portal-card\.competency:hover/);
});

test("style.css provides responsive media query for portal cards on mobile / tablet screens", () => {
  assert.match(css, /@media\s*\(\s*max-width:\s*860px\s*\)[^{]*\{[\s\S]*?\.portal-cards-grid/);
});

// -----------------------------------------------------------------------------
// Group 3: Application State & Navigation Logic (app.js)
// -----------------------------------------------------------------------------
console.log("\n--- Group 3: Application State & Navigation Logic ---");
const appJsPath = path.resolve(process.cwd(), "app.js");
const appJs = fs.readFileSync(appJsPath, "utf-8");

test("app.js exports state with initial activeScreen: 'screen-landing'", () => {
  assert.match(appJs, /activeScreen:\s*["']screen-landing["']/);
});

test("app.js exports switchScreen function", () => {
  assert.match(appJs, /export\s+function\s+switchScreen\s*\(/);
});

test("app.js exports switchModule function", () => {
  assert.match(appJs, /export\s+function\s+switchModule\s*\(/);
});

test("app.js handles screen-landing in switchScreen (hides #nav-links-excel, deactivates module tabs)", () => {
  assert.match(appJs, /if\s*\(\s*screenId\s*===\s*["']screen-landing["']\s*\)/);
  assert.match(appJs, /navLinksExcel\.style\.display\s*=\s*["']none["']/);
});

test("app.js routes #nav-brand click to switchScreen('screen-landing')", () => {
  assert.match(appJs, /document\.getElementById\(["']nav-brand["']\)\?\.addEventListener\(["']click["'],\s*\(\)\s*=>\s*switchScreen\(["']screen-landing["']\)\)/);
});

test("app.js binds #btn-launch-excel and #btn-launch-competency to switchModule", () => {
  assert.match(appJs, /document\.getElementById\(["']btn-launch-excel["']\)\?\.addEventListener\(["']click["'],\s*\(\)\s*=>\s*switchModule\(["']excel["']\)\)/);
  assert.match(appJs, /document\.getElementById\(["']btn-launch-competency["']\)\?\.addEventListener\(["']click["'],\s*\(\)\s*=>\s*switchModule\(["']competency["']\)\)/);
});

// -----------------------------------------------------------------------------
// Group 4: Runtime Mock DOM Simulator & In-Memory State Preservation
// -----------------------------------------------------------------------------
console.log("\n--- Group 4: Runtime Mock DOM Simulator & State Preservation ---");

// Build a lightweight mock DOM to test switchScreen & switchModule runtime behavior
class MockElement {
  constructor(id, tag = "div") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classes = new Set();
    this.attributes = {};
    this.style = {};
    this.listeners = {};
    this.dataset = {};
  }
  get classList() {
    return {
      add: (cls) => this.classes.add(cls),
      remove: (cls) => this.classes.delete(cls),
      toggle: (cls, force) => {
        if (force === undefined) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        } else if (force) {
          this.classes.add(cls);
        } else {
          this.classes.delete(cls);
        }
      },
      contains: (cls) => this.classes.has(cls)
    };
  }
  setAttribute(attr, val) {
    this.attributes[attr] = String(val);
  }
  getAttribute(attr) {
    return this.attributes[attr] || null;
  }
  addEventListener(evt, handler) {
    this.listeners[evt] = this.listeners[evt] || [];
    this.listeners[evt].push(handler);
  }
  dispatchEvent(evt) {
    (this.listeners[evt.type || evt] || []).forEach(h => h(evt));
  }
}

// Setup global mock document
const mockElements = {
  "screen-landing": new MockElement("screen-landing", "section"),
  "screen-generator": new MockElement("screen-generator", "section"),
  "screen-test": new MockElement("screen-test", "section"),
  "screen-answers": new MockElement("screen-answers", "section"),
  "screen-drills": new MockElement("screen-drills", "section"),
  "screen-progress": new MockElement("screen-progress", "section"),
  "screen-competency": new MockElement("screen-competency", "section"),
  "nav-links-excel": new MockElement("nav-links-excel", "nav"),
  "btn-module-excel": new MockElement("btn-module-excel", "button"),
  "btn-module-competency": new MockElement("btn-module-competency", "button"),
  "nav-brand": new MockElement("nav-brand", "div"),
  "btn-launch-excel": new MockElement("btn-launch-excel", "button"),
  "btn-launch-competency": new MockElement("btn-launch-competency", "button"),
  "portal-card-excel": new MockElement("portal-card-excel", "div"),
  "portal-card-competency": new MockElement("portal-card-competency", "div"),
  "chat-context-screen": new MockElement("chat-context-screen", "span")
};

// Add nav buttons
["screen-landing", "screen-generator", "screen-test", "screen-answers", "screen-drills", "screen-progress", "screen-competency"].forEach(s => {
  const btn = new MockElement(`nav-btn-${s}`, "button");
  btn.dataset.screen = s;
  mockElements[`nav-btn-${s}`] = btn;
});

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => {
    const match = sel.match(/\[data-screen=["']?([^"']+)["']?\]/);
    if (match) return mockElements[`nav-btn-${match[1]}`] || null;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === ".screen") {
      return Object.values(mockElements).filter(el => el.id.startsWith("screen-"));
    }
    if (sel === ".nav-btn") {
      return Object.values(mockElements).filter(el => el.id.startsWith("nav-btn-"));
    }
    return [];
  }
};

const { state, switchScreen, switchModule } = await import("../app.js");

test("Initial activeScreen in imported state is 'screen-landing'", () => {
  assert.strictEqual(state.activeScreen, "screen-landing");
});

test("switchScreen('screen-landing') deactivates other screens and hides Excel nav links", () => {
  // Pre-activate generator
  mockElements["screen-generator"].classList.add("active");
  mockElements["nav-links-excel"].style.display = "flex";
  mockElements["btn-module-excel"].classList.add("active");

  switchScreen("screen-landing");

  assert.strictEqual(state.activeScreen, "screen-landing");
  assert.ok(mockElements["screen-landing"].classList.contains("active"), "screen-landing must be active");
  assert.ok(!mockElements["screen-generator"].classList.contains("active"), "screen-generator must NOT be active");
  assert.strictEqual(mockElements["nav-links-excel"].style.display, "none", "Excel sub-nav must be hidden");
  assert.ok(!mockElements["btn-module-excel"].classList.contains("active"), "btn-module-excel must not be active");
  assert.ok(!mockElements["btn-module-competency"].classList.contains("active"), "btn-module-competency must not be active");
});

test("switchModule('excel') from landing hub transitions to screen-generator and reveals sub-nav", () => {
  switchScreen("screen-landing");
  state.currentTest = null; // No test yet

  switchModule("excel");

  assert.strictEqual(state.currentModule, "excel");
  assert.strictEqual(state.activeScreen, "screen-generator");
  assert.ok(mockElements["screen-generator"].classList.contains("active"));
  assert.strictEqual(mockElements["nav-links-excel"].style.display, "flex");
  assert.ok(mockElements["btn-module-excel"].classList.contains("active"));
  assert.ok(!mockElements["btn-module-competency"].classList.contains("active"));
});

test("switchModule('competency') transitions to screen-competency and hides Excel sub-nav", () => {
  switchModule("competency");

  assert.strictEqual(state.currentModule, "competency");
  assert.strictEqual(state.activeScreen, "screen-competency");
  assert.ok(mockElements["screen-competency"].classList.contains("active"));
  assert.strictEqual(mockElements["nav-links-excel"].style.display, "none");
  assert.ok(mockElements["btn-module-competency"].classList.contains("active"));
  assert.ok(!mockElements["btn-module-excel"].classList.contains("active"));
});

test("Navigating back to Welcome Hub preserves active test and CV state without data loss", () => {
  // Populate simulated active test
  state.currentTest = {
    test: { id: "test_retention_99", title: "Enterprise Executive Cohort Study" },
    answerKey: [{ taskNumber: 1, formula: "=LET(x, 1, x)" }]
  };
  state.timer.remainingSeconds = 1420;
  state.competency.cvText = "Test CV content";

  // User clicks Brand Logo / Home
  switchScreen("screen-landing");

  assert.strictEqual(state.activeScreen, "screen-landing");
  // Check that test and competency data are preserved intact
  assert.ok(state.currentTest !== null, "state.currentTest must not be wiped");
  assert.strictEqual(state.currentTest.test.id, "test_retention_99");
  assert.strictEqual(state.timer.remainingSeconds, 1420, "Timer remainingSeconds must not be wiped");
  assert.strictEqual(state.competency.cvText, "Test CV content", "CV content must not be wiped");

  // Clicking Launch Excel with an existing test resumes active test screen!
  switchModule("excel");
  assert.strictEqual(state.activeScreen, "screen-test", "Should resume screen-test if an active test is present");
  assert.ok(mockElements["screen-test"].classList.contains("active"));
});

// -----------------------------------------------------------------------------
// Final Report
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`  VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log("================================================================================\n");

if (passed === total) {
  console.log("🎉 ALL LANDING PAGE & NAVIGATION TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("⚠️ SOME TESTS FAILED. Please review the output above.");
  process.exit(1);
}
